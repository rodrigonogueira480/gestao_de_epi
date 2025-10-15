-- Banco relacional para gestão de EPIs e treinamentos
-- Plataforma alvo: PostgreSQL 14+

CREATE SCHEMA IF NOT EXISTS epi_core;
SET search_path TO epi_core, public;

/* -----------------------------------------------------
 * Empresas (matriz e filiais)
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS companies (
    id               BIGSERIAL PRIMARY KEY,
    parent_company_id BIGINT REFERENCES companies (id) ON DELETE SET NULL,
    name             VARCHAR(160) NOT NULL,
    legal_name       VARCHAR(240),
    cnpj             VARCHAR(20) UNIQUE NOT NULL,
    company_type     VARCHAR(10) NOT NULL CHECK (company_type IN ('MATRIZ', 'FILIAL')),
    state_registration VARCHAR(30),
    municipal_registration VARCHAR(30),
    address_line     VARCHAR(200),
    city             VARCHAR(120),
    state            CHAR(2),
    postal_code      VARCHAR(12),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_parent ON companies (parent_company_id);

/* -----------------------------------------------------
 * Funcionarios
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS employees (
    id             BIGSERIAL PRIMARY KEY,
    company_id     BIGINT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    full_name      VARCHAR(180) NOT NULL,
    enrollment     VARCHAR(40) NOT NULL,
    national_id    VARCHAR(20),
    role           VARCHAR(120),
    department     VARCHAR(120),
    cost_center    VARCHAR(60),
    hire_date      DATE,
    email          VARCHAR(160),
    phone          VARCHAR(30),
    active         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, enrollment)
);

CREATE INDEX idx_employees_company ON employees (company_id);

/* -----------------------------------------------------
 * Catálogo de EPIs
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS epis (
    id             BIGSERIAL PRIMARY KEY,
    company_id     BIGINT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name           VARCHAR(160) NOT NULL,
    ca_number      VARCHAR(30) NOT NULL,
    description    TEXT,
    manufacturer   VARCHAR(160),
    sku            VARCHAR(60),
    validity_days  INTEGER,
    stock_min      INTEGER DEFAULT 0 CHECK (stock_min >= 0),
    stock_max      INTEGER,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, ca_number)
);

CREATE INDEX idx_epis_company ON epis (company_id);

/* -----------------------------------------------------
 * Lotes/Séries de EPIs no estoque
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS epi_batches (
    id                 BIGSERIAL PRIMARY KEY,
    epi_id             BIGINT NOT NULL REFERENCES epis (id) ON DELETE CASCADE,
    company_id         BIGINT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    lot_code           VARCHAR(80),
    serial_code        VARCHAR(80),
    ca_valid_until     DATE,
    manufacture_date   DATE,
    expiration_date    DATE,
    total_quantity     INTEGER NOT NULL CHECK (total_quantity >= 0),
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    location           VARCHAR(120),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (epi_id, COALESCE(lot_code, ''), COALESCE(serial_code, ''))
);

CREATE INDEX idx_epi_batches_epi ON epi_batches (epi_id);
CREATE INDEX idx_epi_batches_company ON epi_batches (company_id);

/* -----------------------------------------------------
 * Movimentações de estoque (entrega, devolução, ajuste)
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS stock_movements (
    id                BIGSERIAL PRIMARY KEY,
    epi_batch_id      BIGINT NOT NULL REFERENCES epi_batches (id) ON DELETE CASCADE,
    company_id        BIGINT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    employee_id       BIGINT REFERENCES employees (id) ON DELETE SET NULL,
    movement_type     VARCHAR(20) NOT NULL CHECK (
        movement_type IN ('ENTREGA', 'DEVOLUCAO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')
    ),
    authentication_method VARCHAR(40) CHECK (
        authentication_method IN ('BIOMETRIA_DIGITAL', 'RECONHECIMENTO_FACIAL', 'PIN', 'ASSINATURA')
    ),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    movement_reason   VARCHAR(160),
    notes             TEXT,
    movement_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(120),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_batch ON stock_movements (epi_batch_id);
CREATE INDEX idx_stock_movements_employee ON stock_movements (employee_id);

/* -----------------------------------------------------
 * Eventos biométricos / facial por movimentação
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS biometric_events (
    id                 BIGSERIAL PRIMARY KEY,
    stock_movement_id  BIGINT NOT NULL REFERENCES stock_movements (id) ON DELETE CASCADE,
    biometric_hash     TEXT NOT NULL,
    biometric_algorithm VARCHAR(60),
    face_vector        BYTEA,
    liveness_score     NUMERIC(5,2),
    confidence_score   NUMERIC(5,2),
    captured_at        TIMESTAMPTZ DEFAULT NOW(),
    device_identifier  VARCHAR(120),
    metadata           JSONB DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX idx_biometric_unique_movement ON biometric_events (stock_movement_id);

/* -----------------------------------------------------
 * Treinamentos e participação
 * --------------------------------------------------- */
CREATE TABLE IF NOT EXISTS training_sessions (
    id             BIGSERIAL PRIMARY KEY,
    company_id     BIGINT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    scheduled_at   TIMESTAMPTZ,
    duration_hours NUMERIC(5,2),
    location       VARCHAR(160),
    responsible_id BIGINT REFERENCES employees (id) ON DELETE SET NULL,
    requires_certificate BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_company ON training_sessions (company_id);
CREATE INDEX idx_training_schedule ON training_sessions (scheduled_at);

CREATE TABLE IF NOT EXISTS training_participants (
    id                 BIGSERIAL PRIMARY KEY,
    training_session_id BIGINT NOT NULL REFERENCES training_sessions (id) ON DELETE CASCADE,
    employee_id        BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    attendance         BOOLEAN,
    authentication_method VARCHAR(40),
    signed_at          TIMESTAMPTZ,
    certificate_url    TEXT,
    score              NUMERIC(5,2),
    notes              TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (training_session_id, employee_id)
);

CREATE INDEX idx_training_participants_employee ON training_participants (employee_id);

/* -----------------------------------------------------
 * Funções e gatilhos para manter o saldo de estoque
 * --------------------------------------------------- */
CREATE OR REPLACE FUNCTION fn_apply_stock_movement()
RETURNS TRIGGER AS
$$
DECLARE
    v_quantity INTEGER := COALESCE(NEW.quantity, 0);
    v_new_balance INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.movement_type = 'ENTREGA' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available - v_quantity,
                   updated_at = NOW()
             WHERE id = NEW.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSIF NEW.movement_type = 'DEVOLUCAO' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available + v_quantity,
                   updated_at = NOW()
             WHERE id = NEW.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSIF NEW.movement_type = 'AJUSTE_POSITIVO' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available + v_quantity,
                   total_quantity = total_quantity + v_quantity,
                   updated_at = NOW()
             WHERE id = NEW.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSE -- AJUSTE_NEGATIVO
            UPDATE epi_batches
               SET quantity_available = quantity_available - v_quantity,
                   total_quantity = total_quantity - v_quantity,
                   updated_at = NOW()
             WHERE id = NEW.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.movement_type = 'ENTREGA' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available + OLD.quantity,
                   updated_at = NOW()
             WHERE id = OLD.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSIF OLD.movement_type = 'DEVOLUCAO' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available - OLD.quantity,
                   updated_at = NOW()
             WHERE id = OLD.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSIF OLD.movement_type = 'AJUSTE_POSITIVO' THEN
            UPDATE epi_batches
               SET quantity_available = quantity_available - OLD.quantity,
                   total_quantity = total_quantity - OLD.quantity,
                   updated_at = NOW()
             WHERE id = OLD.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        ELSE -- AJUSTE_NEGATIVO
            UPDATE epi_batches
               SET quantity_available = quantity_available + OLD.quantity,
                   total_quantity = total_quantity + OLD.quantity,
                   updated_at = NOW()
             WHERE id = OLD.epi_batch_id
         RETURNING quantity_available INTO v_new_balance;
        END IF;
    END IF;

    IF v_new_balance IS NOT NULL AND v_new_balance < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente no lote % (saldo resultante %)', NEW.epi_batch_id, v_new_balance;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movements_ins ON stock_movements;
DROP TRIGGER IF EXISTS trg_stock_movements_del ON stock_movements;

CREATE TRIGGER trg_stock_movements_ins
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION fn_apply_stock_movement();

CREATE TRIGGER trg_stock_movements_del
AFTER DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION fn_apply_stock_movement();

/* -----------------------------------------------------
 * Views de apoio a indicadores
 * --------------------------------------------------- */
CREATE OR REPLACE VIEW vw_epi_saldo AS
SELECT
    b.id                AS epi_batch_id,
    e.name              AS epi_name,
    e.ca_number         AS ca,
    b.lot_code,
    b.serial_code,
    b.quantity_available,
    b.total_quantity,
    b.ca_valid_until,
    b.company_id,
    c.name              AS company_name
FROM epi_batches b
JOIN epis e ON e.id = b.epi_id
JOIN companies c ON c.id = b.company_id;

CREATE OR REPLACE VIEW vw_epi_ca_vencendo AS
SELECT *
FROM vw_epi_saldo
WHERE ca_valid_until IS NOT NULL
  AND ca_valid_until <= (CURRENT_DATE + INTERVAL '45 days');

/* -----------------------------------------------------
 * Dados de apoio (ex.: métodos permitidos)
 * --------------------------------------------------- */
INSERT INTO companies (name, legal_name, cnpj, company_type)
VALUES ('Empresa Exemplo - Matriz', 'Empresa Exemplo S.A.', '00.000.000/0001-00', 'MATRIZ')
ON CONFLICT (cnpj) DO NOTHING;

document.addEventListener('DOMContentLoaded', () => {
    /* -----------------------------
     * Modal de autenticação
     * --------------------------- */
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.querySelector('.btn-login');
    const closeBtn = loginModal ? loginModal.querySelector('.close-btn') : null;
    const authTabButtons = loginModal ? Array.from(loginModal.querySelectorAll('.auth-tabs .tab-btn')) : [];
    const authTabContents = loginModal ? Array.from(loginModal.querySelectorAll('.modal-body .tab-content')) : [];
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');

    const showAuthTab = (tabId) => {
        authTabContents.forEach(content => {
            content.style.display = content.id === tabId ? 'block' : 'none';
        });
        authTabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });
    };

    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', (event) => {
            event.preventDefault();
            loginModal.style.display = 'flex';
            showAuthTab('login');
        });
    }

    if (closeBtn && loginModal) {
        closeBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    authTabButtons.forEach(button => {
        button.addEventListener('click', () => showAuthTab(button.dataset.tab));
    });

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (event) => {
            event.preventDefault();
            showAuthTab('recuperar-senha');
        });
    }

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (event) => {
            event.preventDefault();
            showAuthTab('login');
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Login simulado para fins de demonstracao.');
            if (loginModal) loginModal.style.display = 'none';
        });
    }

    const registerForm = document.getElementById('cadastro-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Cadastro simulado com sucesso.');
            if (loginModal) loginModal.style.display = 'none';
        });
    }

    const recoverForm = document.getElementById('recuperar-form');
    if (recoverForm) {
        recoverForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Enviamos um e-mail com as instrucoes de redefinicao.');
            showAuthTab('login');
        });
    }

    /* -----------------------------
     * Utilidades gerais
     * --------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (event) => {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const target = document.querySelector(targetId);
            if (!target) return;
            event.preventDefault();
            const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: offset, behavior: 'smooth' });
        });
    });

    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = String(new Date().getFullYear());
    }

    /* -----------------------------
     * Estado da aplicação
     * --------------------------- */
    const state = {
        companies: [],
        employees: [],
        epis: [],
        movements: [],
        trainings: []
    };

    const dom = {
        companyForm: document.getElementById('empresa-form'),
        companyMatrixSelect: document.getElementById('empresa-matriz'),
        companiesTable: document.getElementById('empresas-table-body'),
        employeeForm: document.getElementById('funcionario-form'),
        employeeCompanySelect: document.getElementById('funcionario-empresa'),
        employeesTable: document.getElementById('funcionarios-table-body'),
        epiForm: document.getElementById('epi-form'),
        epiCompanySelect: document.getElementById('epi-empresa'),
        episTable: document.getElementById('epis-table-body'),
        deliveryForm: document.getElementById('entrega-form'),
        deliveryEmployeeSelect: document.getElementById('entrega-funcionario'),
        deliveryEpiSelect: document.getElementById('entrega-epi'),
        deliveriesTable: document.getElementById('entregas-table-body'),
        trainingForm: document.getElementById('treinamento-form'),
        trainingEmployeeSelect: document.getElementById('treinamento-colaborador'),
        trainingsTable: document.getElementById('treinamentos-table-body'),
        kpiEpis: document.getElementById('kpi-epis'),
        kpiEntregas: document.getElementById('kpi-entregas'),
        kpiTreinamentos: document.getElementById('kpi-treinamentos')
    };

    const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char] || char));

    const findCompany = (id) => state.companies.find(company => company.id === id);
    const findEmployee = (id) => state.employees.find(employee => employee.id === id);
    const findEpi = (id) => state.epis.find(epi => epi.id === id);

    const renderEmptyRow = (colspan, message) =>
        `<tr><td colspan="${colspan}" class="empty">${message}</td></tr>`;

    const updateKpis = () => {
        if (dom.kpiEpis) {
            const totalStock = state.epis.reduce((total, epi) => total + epi.quantity, 0);
            dom.kpiEpis.textContent = String(totalStock);
        }
        if (dom.kpiEntregas) {
            dom.kpiEntregas.textContent = String(state.movements.length);
        }
        if (dom.kpiTreinamentos) {
            dom.kpiTreinamentos.textContent = String(state.trainings.length);
        }
    };

    const updateMatrixOptions = () => {
        if (!dom.companyMatrixSelect) return;
        dom.companyMatrixSelect.innerHTML = [
            '<option value="">Nao se aplica</option>',
            ...state.companies
                .filter(company => company.type === 'Matriz')
                .map(company => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
        ].join('');
    };

    const updateCompanyDependentSelects = () => {
        const companyOptions = [
            '<option value="">Selecione...</option>',
            ...state.companies.map(company => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
        ].join('');

        if (dom.employeeCompanySelect) {
            dom.employeeCompanySelect.innerHTML = companyOptions;
        }
        if (dom.epiCompanySelect) {
            dom.epiCompanySelect.innerHTML = companyOptions;
        }
    };

    const updateDeliverySelects = () => {
        const employeeOptions = [
            '<option value="">Selecione...</option>',
            ...state.employees.map(employee => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
        ].join('');
        const epiOptions = [
            '<option value="">Selecione...</option>',
            ...state.epis.map(epi => `<option value="${epi.id}">${escapeHtml(epi.name)} (CA ${escapeHtml(epi.ca)})</option>`)
        ].join('');
        if (dom.deliveryEmployeeSelect) dom.deliveryEmployeeSelect.innerHTML = employeeOptions;
        if (dom.deliveryEpiSelect) dom.deliveryEpiSelect.innerHTML = epiOptions;
    };

    const updateTrainingParticipants = () => {
        if (!dom.trainingEmployeeSelect) return;
        dom.trainingEmployeeSelect.innerHTML = [
            '<option value="">Selecione...</option>',
            ...state.employees.map(employee => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
        ].join('');
    };

    const renderCompanies = () => {
        if (!dom.companiesTable) return;
        if (!state.companies.length) {
            dom.companiesTable.innerHTML = renderEmptyRow(5, 'Nenhum registro ainda.');
            return;
        }
        dom.companiesTable.innerHTML = state.companies.map(company => {
            const matrix = company.parentId ? escapeHtml(findCompany(company.parentId)?.name || '-') : '-';
            return `
                <tr>
                    <td>${escapeHtml(company.name)}</td>
                    <td>${escapeHtml(company.cnpj)}</td>
                    <td>${escapeHtml(company.type)}</td>
                    <td>${matrix}</td>
                    <td>${escapeHtml(company.address || '-')}</td>
                </tr>
            `;
        }).join('');
    };

    const renderEmployees = () => {
        if (!dom.employeesTable) return;
        if (!state.employees.length) {
            dom.employeesTable.innerHTML = renderEmptyRow(5, 'Nenhum registro ainda.');
            return;
        }
        dom.employeesTable.innerHTML = state.employees.map(employee => {
            const companyName = escapeHtml(findCompany(employee.companyId)?.name || '-');
            return `
                <tr>
                    <td>${escapeHtml(employee.name)}</td>
                    <td>${escapeHtml(employee.register)}</td>
                    <td>${companyName}</td>
                    <td>${escapeHtml(employee.department || '-')}</td>
                    <td>${escapeHtml(employee.role || '-')}</td>
                </tr>
            `;
        }).join('');
    };

    const renderEpis = () => {
        if (!dom.episTable) return;
        if (!state.epis.length) {
            dom.episTable.innerHTML = renderEmptyRow(7, 'Nenhum registro ainda.');
            return;
        }
        dom.episTable.innerHTML = state.epis.map(epi => {
            const companyName = escapeHtml(findCompany(epi.companyId)?.name || '-');
            const validity = epi.caValidity ? new Date(epi.caValidity).toLocaleDateString('pt-BR') : '-';
            return `
                <tr>
                    <td>${escapeHtml(epi.name)}</td>
                    <td>${escapeHtml(epi.ca)}</td>
                    <td>${escapeHtml(epi.lot || '-')}</td>
                    <td>${escapeHtml(epi.serial || '-')}</td>
                    <td>${companyName}</td>
                    <td>${epi.quantity}</td>
                    <td>${validity}</td>
                </tr>
            `;
        }).join('');
    };

    const renderMovements = () => {
        if (!dom.deliveriesTable) return;
        if (!state.movements.length) {
            dom.deliveriesTable.innerHTML = renderEmptyRow(7, 'Nenhum registro ainda.');
            return;
        }
        dom.deliveriesTable.innerHTML = state.movements.map(movement => {
            const employeeName = escapeHtml(findEmployee(movement.employeeId)?.name || '-');
            const epiName = escapeHtml(findEpi(movement.epiId)?.name || '-');
            return `
                <tr>
                    <td>${movement.date}</td>
                    <td>${employeeName}</td>
                    <td>${epiName}</td>
                    <td>${escapeHtml(movement.type)}</td>
                    <td>${movement.quantity}</td>
                    <td>${escapeHtml(movement.authentication || '-')}</td>
                    <td>${escapeHtml(movement.notes || '-')}</td>
                </tr>
            `;
        }).join('');
    };

    const renderTrainings = () => {
        if (!dom.trainingsTable) return;
        if (!state.trainings.length) {
            dom.trainingsTable.innerHTML = renderEmptyRow(5, 'Nenhum registro ainda.');
            return;
        }
        dom.trainingsTable.innerHTML = state.trainings.map(training => {
            const participantName = training.participantId ? escapeHtml(findEmployee(training.participantId)?.name || '-') : '-';
            const dateLabel = training.date ? new Date(training.date).toLocaleDateString('pt-BR') : '-';
            const certificateUrl = training.certificate && /^https?:\/\//i.test(training.certificate)
                ? training.certificate
                : '';
            const certificateCell = certificateUrl
                ? `<a href="${escapeHtml(certificateUrl)}" target="_blank" rel="noopener">Abrir</a>`
                : '-';
            return `
                <tr>
                    <td>${escapeHtml(training.name)}</td>
                    <td>${dateLabel}</td>
                    <td>${escapeHtml(training.responsible || '-')}</td>
                    <td>${participantName}</td>
                    <td>${certificateCell}</td>
                </tr>
            `;
        }).join('');
    };

    const refreshDashboard = () => {
        renderCompanies();
        renderEmployees();
        renderEpis();
        renderMovements();
        renderTrainings();
        updateKpis();
        updateMatrixOptions();
        updateCompanyDependentSelects();
        updateDeliverySelects();
        updateTrainingParticipants();
    };

    /* -----------------------------
     * Handlers de formulários
     * --------------------------- */
    if (dom.companyForm) {
        dom.companyForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const company = {
                id: createId('company'),
                name: dom.companyForm.querySelector('#empresa-nome').value.trim(),
                cnpj: dom.companyForm.querySelector('#empresa-cnpj').value.trim(),
                type: dom.companyForm.querySelector('#empresa-tipo').value,
                parentId: dom.companyForm.querySelector('#empresa-matriz').value || '',
                address: dom.companyForm.querySelector('#empresa-endereco').value.trim()
            };
            state.companies.push(company);
            dom.companyForm.reset();
            dom.companyForm.querySelector('#empresa-tipo').value = 'Matriz';
            refreshDashboard();
        });
    }

    if (dom.employeeForm) {
        dom.employeeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = dom.employeeForm.querySelector('#funcionario-nome').value.trim();
            const register = dom.employeeForm.querySelector('#funcionario-matricula').value.trim();
            const role = dom.employeeForm.querySelector('#funcionario-cargo').value.trim();
            const companyId = dom.employeeForm.querySelector('#funcionario-empresa').value;
            if (!companyId) {
                alert('Selecione uma empresa para o funcionario.');
                return;
            }
            const employee = {
                id: createId('employee'),
                name,
                register,
                role,
                companyId,
                department: dom.employeeForm.querySelector('#funcionario-setor').value.trim()
            };
            state.employees.push(employee);
            dom.employeeForm.reset();
            refreshDashboard();
        });
    }

    if (dom.epiForm) {
        dom.epiForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const companyId = dom.epiForm.querySelector('#epi-empresa').value;
            if (!companyId) {
                alert('Selecione uma empresa responsavel pelo EPI.');
                return;
            }
            const quantity = Number(dom.epiForm.querySelector('#epi-quantidade').value) || 0;
            const epi = {
                id: createId('epi'),
                name: dom.epiForm.querySelector('#epi-nome').value.trim(),
                ca: dom.epiForm.querySelector('#epi-ca').value.trim(),
                lot: dom.epiForm.querySelector('#epi-lote').value.trim(),
                serial: dom.epiForm.querySelector('#epi-serial').value.trim(),
                quantity,
                caValidity: dom.epiForm.querySelector('#epi-validade').value,
                companyId
            };
            state.epis.push(epi);
            dom.epiForm.reset();
            refreshDashboard();
        });
    }

    if (dom.deliveryForm) {
        dom.deliveryForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const employeeId = dom.deliveryForm.querySelector('#entrega-funcionario').value;
            const epiId = dom.deliveryForm.querySelector('#entrega-epi').value;
            const type = dom.deliveryForm.querySelector('#entrega-tipo').value;
            const quantity = Number(dom.deliveryForm.querySelector('#entrega-quantidade').value) || 0;
            const authentication = dom.deliveryForm.querySelector('#entrega-autenticacao').value;
            const notes = dom.deliveryForm.querySelector('#entrega-observacoes').value.trim();

            if (!employeeId || !epiId) {
                alert('Selecione o funcionario e o EPI para registrar o movimento.');
                return;
            }
            if (quantity <= 0) {
                alert('A quantidade deve ser maior que zero.');
                return;
            }

            const epi = findEpi(epiId);
            if (!epi) {
                alert('EPI nao encontrado.');
                return;
            }

            if (type === 'Entrega' && epi.quantity < quantity) {
                alert('Quantidade em estoque insuficiente para esta entrega.');
                return;
            }

            if (type === 'Entrega') {
                epi.quantity -= quantity;
            } else {
                epi.quantity += quantity;
            }

            state.movements.push({
                id: createId('movement'),
                employeeId,
                epiId,
                type,
                quantity,
                authentication,
                notes,
                date: new Date().toLocaleString('pt-BR')
            });

            dom.deliveryForm.reset();
            refreshDashboard();
        });
    }

    if (dom.trainingForm) {
        dom.trainingForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const training = {
                id: createId('training'),
                name: dom.trainingForm.querySelector('#treinamento-nome').value.trim(),
                date: dom.trainingForm.querySelector('#treinamento-data').value,
                responsible: dom.trainingForm.querySelector('#treinamento-responsavel').value.trim(),
                participantId: dom.trainingForm.querySelector('#treinamento-colaborador').value || '',
                certificate: dom.trainingForm.querySelector('#treinamento-certificado').value.trim()
            };
            state.trainings.push(training);
            dom.trainingForm.reset();
            refreshDashboard();
        });
    }

    /* -----------------------------
     * Tabs do painel operacional
     * --------------------------- */
    const controlTabButtons = document.querySelectorAll('.control-tabs .tab-btn');
    const panelContents = document.querySelectorAll('.panel-content');

    controlTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.tab;
            controlTabButtons.forEach(btn => btn.classList.toggle('active', btn === button));
            panelContents.forEach(content => {
                content.style.display = content.id === targetId ? 'block' : 'none';
            });
        });
    });

    /* Inicializa renderização */
    refreshDashboard();
});

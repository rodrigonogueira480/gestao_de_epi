document.addEventListener('DOMContentLoaded', function() {
    // Login Modal
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.querySelector('.btn-login');
    const closeBtn = document.querySelector('.close-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    
    // Abrir modal de login
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        loginModal.style.display = 'flex';
    });
    
    // Fechar modal de login
    closeBtn.addEventListener('click', function() {
        loginModal.style.display = 'none';
    });
    
    // Fechar modal ao clicar fora dele
    window.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Alternar entre abas de login e cadastro
    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            // Remover classe active de todos os botões
            tabBtns.forEach(function(btn) {
                btn.classList.remove('active');
            });
            
            // Adicionar classe active ao botão clicado
            this.classList.add('active');
            
            // Esconder todos os conteúdos de abas
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Mostrar o conteúdo da aba selecionada
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });
    
    // Link "Esqueci minha senha"
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Esconder todos os conteúdos de abas
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Mostrar o formulário de recuperação de senha
            document.getElementById('recuperar-senha').style.display = 'block';
            
            // Remover classe active de todos os botões
            tabBtns.forEach(function(btn) {
                btn.classList.remove('active');
            });
        });
    }
    
    // Link "Voltar para o login"
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Esconder todos os conteúdos de abas
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Mostrar o formulário de login
            document.getElementById('login').style.display = 'block';
            
            // Ativar o botão de login
            tabBtns.forEach(function(btn) {
                if (btn.getAttribute('data-tab') === 'login') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }
    
    // Formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Aqui você implementaria a lógica de autenticação
            console.log('Login:', email, password);
            
            // Simulação de login bem-sucedido
            alert('Login realizado com sucesso!');
            loginModal.style.display = 'none';
        });
    }
    
    // Formulário de cadastro
    const cadastroForm = document.getElementById('cadastro-form');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email-cadastro').value;
            const empresa = document.getElementById('empresa').value;
            const password = document.getElementById('password-cadastro').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Verificar se as senhas coincidem
            if (password !== confirmPassword) {
                alert('As senhas não coincidem!');
                return;
            }
            
            // Aqui você implementaria a lógica de cadastro
            console.log('Cadastro:', nome, email, empresa, password);
            
            // Simulação de cadastro bem-sucedido
            alert('Cadastro realizado com sucesso!');
            loginModal.style.display = 'none';
        });
    }
    
    // Formulário de recuperação de senha
    const recuperarForm = document.getElementById('recuperar-form');
    if (recuperarForm) {
        recuperarForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email-recuperar').value;
            
            // Aqui você implementaria a lógica de recuperação de senha
            console.log('Recuperar senha:', email);
            
            // Simulação de envio de instruções
            alert('Instruções de recuperação de senha enviadas para o seu e-mail!');
            
            // Voltar para o formulário de login
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            document.getElementById('login').style.display = 'block';
            
            // Ativar o botão de login
            tabBtns.forEach(function(btn) {
                if (btn.getAttribute('data-tab') === 'login') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }
    
    // Efeito de rolagem suave para links de âncora
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;
            
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});
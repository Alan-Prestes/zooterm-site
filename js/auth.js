
(function () {
  'use strict';

  const scriptBase = new URL('../', document.currentScript.src);
  const cfg = window.ZOOTERM_CONFIG || {};

  const configured =
    cfg.supabaseUrl &&
    cfg.supabasePublishableKey &&
    !cfg.supabasePublishableKey.includes('COLE_AQUI');

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabasePublishableKey,
        {
          auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true
          }
        }
      )
    : null;

  const $ = id => document.getElementById(id);

  const message = (text, type = '') => {
    const el = $('status');
    if (el) {
      el.textContent = text;
      el.className = 'status ' + type;
    }
  };

  const callbackUrl = () =>
    new URL('auth/callback/', scriptBase).href;

  const homeUrl = () =>
    new URL('index.html', scriptBase).href;

  const ensure = () => {
    if (!client) {
      message(
        'Configure a chave pública do Supabase em js/config.js.',
        'error'
      );
      return false;
    }
    return true;
  };

  const safeError = e =>
    e?.message || 'Não foi possível concluir a operação.';

  let municipios = [];

  // ============================================================
  // 1. MUNICÍPIOS
  // ============================================================

  async function carregarMunicipios() {
    const info = $('municipios-info');

    try {
      const response = await fetch(
        new URL('municipios.json', scriptBase),
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('municipios.json não encontrado');
      }

      const rows = await response.json();

      if (!Array.isArray(rows) || rows.length !== 1191) {
        throw new Error('A lista deve conter 1.191 municípios');
      }

      municipios = rows.map(m => ({
        code_muni: String(m.code_muni),
        nome: String(m.nome),
        estado: String(m.estado)
      }));

      const invalido = municipios.some(m =>
        !/^[0-9]{7}$/.test(m.code_muni) ||
        !['PR', 'SC', 'RS'].includes(m.estado)
      );

      if (invalido) {
        throw new Error('Lista de municípios inválida');
      }

      if (info) {
        info.textContent = 'Selecione seu estado e município.';
      }

    } catch (err) {
      if (info) {
        info.textContent =
          'Lista de municípios indisponível.';
      }

      message(
        'Não foi possível carregar os municípios.',
        'error'
      );
    }
  }

  function atualizarMunicipios() {
    const uf = $('estado')?.value;
    const select = $('municipio');

    if (!select) return;

    select.replaceChildren(
      new Option(
        uf ? 'Selecione o município' : 'Selecione primeiro o estado',
        ''
      )
    );

    municipios
      .filter(m => m.estado === uf)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .forEach(m => {
        select.add(new Option(m.nome, m.code_muni));
      });

    select.disabled = !uf || select.options.length === 1;
  }

  // ============================================================
  // 2. INTERFACE DA PÁGINA INICIAL
  // ============================================================

  function atualizarInterfaceHome(user) {
    const signed = $('signed-in');
    const guest = $('guest-actions');
    const label = $('user-label');

    if (user) {
      signed?.classList.remove('hidden');
      guest?.classList.add('hidden');

      if (label) {
        label.textContent =
          user.user_metadata?.nome ||
          user.email ||
          'Usuário';
      }

    } else {
      signed?.classList.add('hidden');
      guest?.classList.remove('hidden');
    }

    // Botões e mensagens da página inicial.
    // A aplicação Shiny ainda não possui acesso protegido.
    // Por isso, nenhum link direto ao dashboard é liberado.

    const secoes = [
      document.querySelector('.hero .actions'),
      document.querySelector('#acesso .cta')
    ];

    secoes.forEach(secao => {
      if (!secao) return;

      const linksCadastro = secao.querySelectorAll(
        'a[href="cadastro.html"]'
      );

      linksCadastro.forEach(link => {
        link.classList.toggle('hidden', Boolean(user));
      });
    });

    const acesso = document.querySelector('#acesso .cta');

    if (acesso) {
      let aviso = $('zooterm-account-status');

      if (!aviso) {
        aviso = document.createElement('p');
        aviso.id = 'zooterm-account-status';
        aviso.style.marginTop = '12px';
        aviso.style.fontWeight = '600';
        acesso.appendChild(aviso);
      }

      aviso.textContent = user
        ? 'Sua conta ZooTerm está ativa. O acesso seguro ao dashboard está em integração.'
        : '';

      aviso.classList.toggle('hidden', !user);
    }

    // Atualiza a descrição da seção de acesso.
    const descricao = document.querySelector('#acesso .cta p');

    if (descricao) {
      descricao.textContent = user
        ? 'Seu cadastro foi confirmado. Estamos finalizando a integração segura com o dashboard.'
        : 'Crie sua conta gratuitamente e confirme seu e-mail para utilizar a plataforma quando o acesso integrado estiver disponível.';
    }
  }

  // ============================================================
  // 3. INICIALIZAÇÃO
  // ============================================================

  document.addEventListener('DOMContentLoaded', async () => {
    const page = document.body.dataset.page;

    // ----------------------------------------------------------
    // CADASTRO
    // ----------------------------------------------------------

    if (page === 'cadastro') {
      await carregarMunicipios();

      $('estado')?.addEventListener(
        'change',
        atualizarMunicipios
      );

      $('signup-form')?.addEventListener(
        'submit',
        async e => {
          e.preventDefault();

          if (!ensure()) return;

          const nome = $('nome').value.trim();
          const email = $('email').value.trim();
          const password = $('password').value;
          const estado = $('estado').value;
          const code_muni = $('municipio').value;
          const instituicao = $('instituicao').value.trim();

          const municipioValido = municipios.some(m =>
            m.estado === estado &&
            m.code_muni === code_muni
          );

          if (!municipioValido) {
            message(
              'Selecione um município válido.',
              'error'
            );
            return;
          }

          if (password.length < 8) {
            message(
              'Utilize uma senha com pelo menos 8 caracteres.',
              'error'
            );
            return;
          }

          message('Enviando cadastro...');

          const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: callbackUrl(),
              data: {
                nome,
                estado,
                code_muni,
                instituicao
              }
            }
          });

          if (error) {
            message(safeError(error), 'error');
            return;
          }

          if (data.session) {
            await client.auth.signOut();
          }

          message(
            'Se o cadastro puder ser realizado, você receberá um e-mail de confirmação. Verifique também a caixa de spam.',
            'success'
          );
        }
      );
    }

    // ----------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------

    if (page === 'login') {
      $('login-form')?.addEventListener(
        'submit',
        async e => {
          e.preventDefault();

          if (!ensure()) return;

          message('Autenticando...');

          const { error } = await client.auth.signInWithPassword({
            email: $('email').value.trim(),
            password: $('password').value
          });

          if (error) {
            message(
              'Não foi possível entrar. Confira as credenciais e a confirmação do e-mail.',
              'error'
            );
            return;
          }

          location.href = homeUrl() + '#acesso';
        }
      );

      // Recuperação de senha
      $('reset-form')?.addEventListener(
        'submit',
        async e => {
          e.preventDefault();

          if (!ensure()) return;

          const { error } =
            await client.auth.resetPasswordForEmail(
              $('reset-email').value.trim(),
              {
                redirectTo: callbackUrl()
              }
            );

          message(
            error
              ? safeError(error)
              : 'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.',
            error ? 'error' : 'success'
          );
        }
      );

      $('show-reset')?.addEventListener('click', () => {
        $('login-form').classList.add('hidden');
        $('reset-form').classList.remove('hidden');
        message('');
      });

      $('show-login')?.addEventListener('click', () => {
        $('reset-form').classList.add('hidden');
        $('login-form').classList.remove('hidden');
        message('');
      });
    }

    // ----------------------------------------------------------
    // CONFIRMAÇÃO DE E-MAIL E RECUPERAÇÃO
    // ----------------------------------------------------------

    if (page === 'callback') {
      if (!ensure()) return;

      const url = new URL(location.href);
      const code = url.searchParams.get('code');

      const type =
        url.searchParams.get('type') ||
        (
          url.hash.includes('type=recovery')
            ? 'recovery'
            : ''
        );

      if (code) {
        const { error } =
          await client.auth.exchangeCodeForSession(code);

        if (error) {
          message(safeError(error), 'error');
          return;
        }
      }

      const {
        data: { session },
        error
      } = await client.auth.getSession();

      if (error || !session) {
        message(
          'Não foi possível validar o link. Solicite um novo e-mail de confirmação.',
          'error'
        );
        return;
      }

      if (
        type === 'recovery' ||
        url.hash.includes('type=recovery')
      ) {
        $('password-change')?.classList.remove('hidden');

        message(
          'Defina sua nova senha.',
          'success'
        );

      } else {
        message(
          'E-mail confirmado! Você já pode acessar sua conta.',
          'success'
        );

        $('go-login')?.classList.remove('hidden');
      }

      $('password-form')?.addEventListener(
        'submit',
        async e => {
          e.preventDefault();

          const pwd = $('new-password').value;

          if (pwd.length < 8) {
            message(
              'A senha deve ter pelo menos 8 caracteres.',
              'error'
            );
            return;
          }

          const { error } = await client.auth.updateUser({
            password: pwd
          });

          if (error) {
            message(safeError(error), 'error');
            return;
          }

          await client.auth.signOut();

          message(
            'Senha atualizada. Faça login novamente.',
            'success'
          );

          $('password-change')?.classList.add('hidden');
          $('go-login')?.classList.remove('hidden');
        }
      );
    }

    // ----------------------------------------------------------
    // TESTE DE AUTENTICAÇÃO COM A EDGE FUNCTION
    // ----------------------------------------------------------

    if (page === 'home') {
      const botaoTeste = $('testar-conexao');
      const resultadoTeste = $('resultado-conexao');

      if (botaoTeste && resultadoTeste && client) {
        botaoTeste.disabled = false;
        resultadoTeste.textContent =
          'Pronto para testar a conexão.';

        botaoTeste.addEventListener('click', async () => {
          botaoTeste.disabled = true;
          resultadoTeste.textContent =
            'Verificando autenticação...';

          try {
            // Obtém a sessão já existente no site.
            const {
              data: { session },
              error: sessionError
            } = await client.auth.getSession();

            if (sessionError || !session) {
              resultadoTeste.textContent =
                'Sessão não encontrada. Faça login novamente.';
              return;
            }

            // Solicita autorização à Edge Function.
            const response = await fetch(
              `${cfg.supabaseUrl}/functions/v1/zooterm-access`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': cfg.supabasePublishableKey,
                  'Authorization':
                    `Bearer ${session.access_token}`
                },
                body: JSON.stringify({})
              }
            );

            const data = await response.json();

if (response.ok && data.access_token) {
  resultadoTeste.textContent =
    'Autenticação validada. Abrindo o dashboard ZooTerm...';

const dashboardUrl =
  'https://zooterm-zooterm.share.connect.posit.cloud/';

  window.location.href =
    dashboardUrl +
    '#access_token=' +
    encodeURIComponent(data.access_token);
} else {
              resultadoTeste.textContent =
                `Falha na autenticação (HTTP ${response.status}): ` +
                (data.error || 'Erro desconhecido');
            }

          } catch (error) {
            resultadoTeste.textContent =
              'Erro de comunicação com o Supabase: ' +
              error.message;
          } finally {
            botaoTeste.disabled = false;
          }
        });
      }
    }


    // ----------------------------------------------------------
    // PÁGINA INICIAL: SESSÃO E LOGOUT
    // ----------------------------------------------------------

    if (page === 'home') {
      if (!client) {
        atualizarInterfaceHome(null);
        return;
      }

      try {
        const {
          data: { user },
          error
        } = await client.auth.getUser();

        atualizarInterfaceHome(error ? null : user);

      } catch (err) {
        atualizarInterfaceHome(null);
      }

      $('logout')?.addEventListener(
        'click',
        async () => {
          const { error } = await client.auth.signOut();

          if (error) {
            alert('Não foi possível encerrar a sessão.');
            return;
          }

          location.href = homeUrl();
        }
      );
    }
  });

})();

/* ============================================================
   ORACULUM ASTRALE - script.js
   JavaScript principal do portal de tarot online.
   Funciona com Supabase (se disponível) ou em modo local (localStorage).
   ============================================================ */

/* --------------------------------------------------------------
   VARIÁVEIS GLOBAIS
-------------------------------------------------------------- */
let usuarioAtual = null;
const STORAGE_KEY = 'oraculum_astrale_user';
const ROULETTE_KEY = 'oraculum_astrale_roleta';

/* Verifica se o Supabase está disponível (carregado antes via tag script) */
const supabaseDisponivel = (typeof window.supabase !== 'undefined' && window.supabase);
let supabaseClient = null;
if (supabaseDisponivel && window.supabase.createClient) {
  // Espera que window.__SUPABASE_URL e window.__SUPABASE_KEY estejam definidos
  const url = window.__SUPABASE_URL || '';
  const key = window.__SUPABASE_KEY || '';
  if (url && key) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
    } catch (e) {
      console.warn('Não foi possível inicializar o Supabase. Usando modo local.', e);
    }
  }
}

/* --------------------------------------------------------------
   FRASES MÍSTICAS DO DIA
-------------------------------------------------------------- */
const FRASES_MISTICAS = [
  "As cartas não revelam o futuro — elas iluminam o caminho.",
  "O universo conspira a seu favor.",
  "Confie no que seu coração já sabe.",
  "Toda resposta está dentro de você.",
  "A sabedoria está em ouvir o silêncio.",
  "Seu destino é escrito pelas escolhas que você faz.",
  "O momento presente é o único que realmente importa.",
  "Às vezes, o que parece um obstáculo é na verdade um portal.",
  "A paciência é a chave para a transformação.",
  "O que você busca também está buscando você.",
  "O tarot não prevê, revela.",
  "O cosmo está alinhado para te ouvir.",
  "As estrelas guiam, mas você escolhe o caminho.",
  "Faça a pergunta certa e o universo responderá.",
  "A magia está na jornada, não no destino."
];

/* --------------------------------------------------------------
   UTILITÁRIOS
-------------------------------------------------------------- */

/* Retorna a data de hoje no formato YYYY-MM-DD */
function dataHoje() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/* Gera um código base64 único a partir do email (para indicação) */
function gerarCodigoRef(email) {
  try {
    return btoa(unescape(encodeURIComponent(email)));
  } catch (e) {
    return btoa(email);
  }
}

/* Decodifica o código base64 de volta para o email */
function decodificarRef(codigo) {
  try {
    return decodeURIComponent(escape(atob(codigo)));
  } catch (e) {
    return '';
  }
}

/* Escapa HTML para evitar injeção em textos dinâmicos */
function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* --------------------------------------------------------------
   1. NAVEGAÇÃO ENTRE TELAS
-------------------------------------------------------------- */
function mostrarTela(telaId) {
  const telas = document.querySelectorAll('.screen');
  telas.forEach(function (tela) {
    tela.classList.remove('screen-active');
  });
  const alvo = document.getElementById(telaId);
  if (alvo) {
    alvo.classList.add('screen-active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --------------------------------------------------------------
   10. TOAST NOTIFICATIONS
-------------------------------------------------------------- */
function mostrarToast(mensagem, tipo) {
  const container = document.querySelector('.toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (tipo || 'info');
  toast.textContent = mensagem;
  container.appendChild(toast);

  // Anima entrada
  requestAnimationFrame(function () {
    toast.classList.add('toast-visible');
  });

  // Remove após 3 segundos
  setTimeout(function () {
    toast.classList.remove('toast-visible');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);
}

/* --------------------------------------------------------------
   4. HEADER DINÂMICO
-------------------------------------------------------------- */
function atualizarHeader() {
  const creditosEl = document.querySelector('[data-credits-value]');
  const streakEl = document.querySelector('[data-streak-value]');
  const greetingEl = document.querySelector('[data-greeting]');

  if (creditosEl) creditosEl.textContent = usuarioAtual ? usuarioAtual.creditos : 0;
  if (streakEl) streakEl.textContent = usuarioAtual ? usuarioAtual.streak : 0;
  if (greetingEl) {
    if (usuarioAtual && usuarioAtual.nome) {
      greetingEl.textContent = 'Bem-vindo(a), ' + usuarioAtual.nome + '!';
    } else {
      greetingEl.textContent = '';
    }
  }
}

/* --------------------------------------------------------------
   5. FRASE MÍSTICA DO DIA
-------------------------------------------------------------- */
function sortearFrase() {
  const dia = new Date().getDate();
  const indice = dia % FRASES_MISTICAS.length;
  const frase = FRASES_MISTICAS[indice];
  const el = document.querySelector('[data-daily-phrase]');
  if (el) el.textContent = frase;
}

/* --------------------------------------------------------------
   2. SISTEMA DE CADASTRO
-------------------------------------------------------------- */
async function cadastrar(nome, email, senha, confirmar) {
  try {
    // Validações
    if (!nome || !email || !senha) {
      mostrarToast('Preencha todos os campos obrigatórios.', 'error');
      return false;
    }
    if (senha.length < 6) {
      mostrarToast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return false;
    }
    if (senha !== confirmar) {
      mostrarToast('As senhas não conferem.', 'error');
      return false;
    }

    const codigoRef = gerarCodigoRef(email);

    if (supabaseClient) {
      // Modo Supabase
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: senha
      });

      if (error) {
        mostrarToast('Erro ao cadastrar: ' + error.message, 'error');
        return false;
      }

      const userId = data && data.user ? data.user.id : null;
      if (userId) {
        await supabaseClient.from('perfis').insert([{
          id: userId,
          nome: nome,
          email: email,
          creditos: 5,
          streak: 0,
          indicacoes: []
        }]);
      }

      usuarioAtual = {
        nome: nome,
        email: email,
        creditos: 5,
        streak: 0,
        ultimoLogin: dataHoje(),
        indicacoes: [],
        codigoRef: codigoRef,
        historico: []
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioAtual));
    } else {
      // Modo local (localStorage)
      const usuarios = JSON.parse(localStorage.getItem('oraculum_astrale_users') || '[]');
      const existe = usuarios.find(function (u) { return u.email === email; });
      if (existe) {
        mostrarToast('Já existe uma conta com este email.', 'error');
        return false;
      }

      const novoUsuario = {
        nome: nome,
        email: email,
        senha: senha,
        creditos: 5,
        streak: 0,
        ultimoLogin: dataHoje(),
        indicacoes: [],
        codigoRef: codigoRef,
        historico: []
      };
      usuarios.push(novoUsuario);
      localStorage.setItem('oraculum_astrale_users', JSON.stringify(usuarios));

      usuarioAtual = Object.assign({}, novoUsuario);
      delete usuarioAtual.senha;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioAtual));
    }

    mostrarToast('Conta criada! Ganhe 5 créditos.', 'success');
    atualizarHeader();
    sortearFrase();
    mostrarTela('main');
    return true;
  } catch (erro) {
    console.error('Erro no cadastro:', erro);
    mostrarToast('Erro ao criar conta. Tente novamente.', 'error');
    return false;
  }
}

/* --------------------------------------------------------------
   3. SISTEMA DE LOGIN
-------------------------------------------------------------- */
async function login(email, senha) {
  try {
    if (!email || !senha) {
      mostrarToast('Preencha email e senha.', 'error');
      return false;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
      });

      if (error) {
        mostrarToast('Email ou senha incorretos.', 'error');
        return false;
      }

      const userId = data && data.user ? data.user.id : null;
      let perfil = null;
      if (userId) {
        const { data: perfilData } = await supabaseClient
          .from('perfis')
          .select('*')
          .eq('id', userId)
          .single();
        perfil = perfilData;
      }

      usuarioAtual = {
        nome: perfil ? perfil.nome : (data.user.email || 'Místico'),
        email: email,
        creditos: perfil ? perfil.creditos : 5,
        streak: perfil ? perfil.streak : 0,
        ultimoLogin: dataHoje(),
        indicacoes: perfil ? perfil.indicacoes : [],
        codigoRef: gerarCodigoRef(email),
        historico: []
      };
    } else {
      // Modo local
      const usuarios = JSON.parse(localStorage.getItem('oraculum_astrale_users') || '[]');
      const user = usuarios.find(function (u) { return u.email === email && u.senha === senha; });
      if (!user) {
        mostrarToast('Email ou senha incorretos.', 'error');
        return false;
      }

      // Lógica de streak
      const hoje = dataHoje();
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const ontemStr = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;

      if (user.ultimoLogin === ontemStr) {
        user.streak = (user.streak || 0) + 1;
      } else if (user.ultimoLogin !== hoje) {
        user.streak = 1;
      }
      user.ultimoLogin = hoje;

      // Salva de volta
      const idx = usuarios.findIndex(function (u) { return u.email === email; });
      usuarios[idx] = user;
      localStorage.setItem('oraculum_astrale_users', JSON.stringify(usuarios));

      usuarioAtual = Object.assign({}, user);
      delete usuarioAtual.senha;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioAtual));
    atualizarHeader();
    sortearFrase();
    mostrarToast('Bem-vindo(a) de volta, ' + usuarioAtual.nome + '!', 'success');
    mostrarTela('main');
    return true;
  } catch (erro) {
    console.error('Erro no login:', erro);
    mostrarToast('Erro ao entrar. Tente novamente.', 'error');
    return false;
  }
}

/* --------------------------------------------------------------
   11. SAIR
-------------------------------------------------------------- */
async function sair() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (e) {
    console.warn('Erro ao sair do Supabase:', e);
  }
  sessionStorage.removeItem(STORAGE_KEY);
  usuarioAtual = null;
  atualizarHeader();
  mostrarTela('welcome');
  mostrarToast('Você saiu do Oraculum Astrale.', 'info');
}

/* --------------------------------------------------------------
   6. CONSULTA DE TAROT
-------------------------------------------------------------- */
function custoTiragem(tipoTiragem) {
  if (tipoTiragem === '3') return 3;
  if (tipoTiragem === 'celta') return 5;
  return 1; // 1 carta
}

function quantidadeCartas(tipoTiragem) {
  if (tipoTiragem === '3') return 3;
  if (tipoTiragem === 'celta') return 10;
  return 1;
}

/* Sorteia N cartas únicas do array global CARTAS */
function sortearCartas(quantidade) {
  if (typeof CARTAS === 'undefined' || !Array.isArray(CARTAS)) {
    console.error('Array CARTAS não encontrado. Verifique cartas.js.');
    return [];
  }
  const baralho = CARTAS.slice();
  const sorteadas = [];
  for (let i = 0; i < quantidade && baralho.length > 0; i++) {
    const idx = Math.floor(Math.random() * baralho.length);
    sorteadas.push(baralho.splice(idx, 1)[0]);
  }
  return sorteadas;
}

/* Monta o texto do arcano (Maior/Menor + naipe) */
function montarArcano(carta) {
  if (carta.arcano === 'maior' || carta.arcano === 'Maior' || carta.arcano === 'maior-menor') {
    return 'Arcano Maior';
  }
  if (carta.naipe) {
    return 'Arcano Menor — ' + carta.naipe;
  }
  return 'Arcano Menor';
}

/* Cria um card de carta com abas */
function criarCardCarta(carta, indice) {
  const template = document.getElementById('card-carta-template');
  let card;
  if (template && template.content) {
    card = template.content.cloneNode(true).firstElementChild;
  } else {
    // Fallback: cria manualmente
    card = document.createElement('div');
    card.className = 'card-carta';
  }

  if (!card) {
    card = document.createElement('div');
    card.className = 'card-carta';
  }

  // Posição da carta (para tiragens múltiplas)
  const posicaoEl = card.querySelector('[data-carta-posicao]');
  if (posicaoEl) posicaoEl.textContent = 'Carta ' + (indice + 1);

  // Imagem
  const imgEl = card.querySelector('[data-carta-imagem]');
  if (imgEl && carta.imagem) imgEl.src = carta.imagem;
  else if (imgEl) imgEl.removeAttribute('src');

  // Nome
  const nomeEl = card.querySelector('[data-carta-nome]');
  if (nomeEl) nomeEl.textContent = carta.nome || 'Carta';

  // Arcano
  const arcanoEl = card.querySelector('[data-carta-arcano]');
  if (arcanoEl) arcanoEl.textContent = montarArcano(carta);

  // Conteúdo das abas
  const geralEl = card.querySelector('[data-carta-geral]');
  if (geralEl) geralEl.textContent = carta.significado || carta.geral || '—';

  const amorEl = card.querySelector('[data-carta-amor]');
  if (amorEl) amorEl.textContent = carta.amor || '—';

  const carreiraEl = card.querySelector('[data-carta-carreira]');
  if (carreiraEl) carreiraEl.textContent = carta.carreira || '—';

  const invertidoEl = card.querySelector('[data-carta-invertido]');
  if (invertidoEl) invertidoEl.textContent = carta.invertido || '—';

  // Primeira aba (Geral) começa ativa
  const abas = card.querySelectorAll('.tab');
  const conteudos = card.querySelectorAll('.tab-content');
  abas.forEach(function (aba) { aba.classList.remove('tab-active'); });
  conteudos.forEach(function (c) { c.classList.remove('tab-content-active'); c.style.display = 'none'; });

  const primeiraAba = card.querySelector('.tab[data-tab="geral"]');
  const primeiroConteudo = card.querySelector('.tab-content[data-tab-content="geral"]');
  if (primeiraAba) primeiraAba.classList.add('tab-active');
  if (primeiroConteudo) {
    primeiroConteudo.classList.add('tab-content-active');
    primeiroConteudo.style.display = 'block';
  }

  return card;
}

async function consultar(pergunta, tipoTiragem) {
  try {
    if (!usuarioAtual) {
      mostrarToast('Você precisa estar logado para consultar.', 'error');
      mostrarTela('login');
      return false;
    }

    if (!pergunta || !pergunta.trim()) {
      mostrarToast('Faça uma pergunta antes de consultar.', 'error');
      return false;
    }

    const custo = custoTiragem(tipoTiragem);
    if (usuarioAtual.creditos < custo) {
      mostrarToast('Créditos insuficientes para esta tiragem.', 'error');
      return false;
    }

    // Deduz créditos
    usuarioAtual.creditos -= custo;

    // Sorteia cartas
    const qtd = quantidadeCartas(tipoTiragem);
    const cartas = sortearCartas(qtd);
    if (cartas.length === 0) {
      mostrarToast('Não foi possível sortear as cartas.', 'error');
      usuarioAtual.creditos += custo; // devolve
      return false;
    }

    // Salva histórico
    if (!usuarioAtual.historico) usuarioAtual.historico = [];
    usuarioAtual.historico.push({
      data: dataHoje(),
      pergunta: pergunta,
      cartas: cartas.map(function (c) { return c.nome; }),
      tipo: tipoTiragem
    });

    // Persiste alterações
    salvarUsuarioAtual();

    // Mostra seção de resultado
    const secaoResultado = document.getElementById('resultado') || document.querySelector('[data-resultado]');
    if (!secaoResultado) {
      mostrarToast('Seção de resultado não encontrada.', 'error');
      return false;
    }

    // Limpa resultados anteriores
    const container = secaoResultado.querySelector('[data-cartas-resultado]') || secaoResultado;
    container.innerHTML = '';

    // Preenche pergunta
    const perguntaEl = secaoResultado.querySelector('[data-resultado-pergunta]');
    if (perguntaEl) perguntaEl.textContent = pergunta;

    // Cria cards
    cartas.forEach(function (carta, i) {
      const card = criarCardCarta(carta, i);
      container.appendChild(card);
    });

    secaoResultado.classList.add('screen-active');
    secaoResultado.style.display = 'block';

    atualizarHeader();
    mostrarToast('As cartas revelaram seu caminho.', 'success');

    // Scroll suave até o resultado
    setTimeout(function () {
      secaoResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    return true;
  } catch (erro) {
    console.error('Erro na consulta:', erro);
    mostrarToast('Erro ao realizar a consulta.', 'error');
    return false;
  }
}

/* Salva o usuárioAtual no sessionStorage e no localStorage (modo local) */
function salvarUsuarioAtual() {
  if (!usuarioAtual) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioAtual));

  if (!supabaseClient) {
    const usuarios = JSON.parse(localStorage.getItem('oraculum_astrale_users') || '[]');
    const idx = usuarios.findIndex(function (u) { return u.email === usuarioAtual.email; });
    if (idx >= 0) {
      // Mantém a senha original
      const senhaSalva = usuarios[idx].senha;
      usuarios[idx] = Object.assign({}, usuarioAtual, { senha: senhaSalva });
      localStorage.setItem('oraculum_astrale_users', JSON.stringify(usuarios));
    }
  }
}

/* --------------------------------------------------------------
   7. SISTEMA DE ABAS DAS CARTAS (Event Delegation)
-------------------------------------------------------------- */
function configurarAbasCartas() {
  document.addEventListener('click', function (evento) {
    const aba = evento.target.closest('.tab');
    if (!aba) return;

    const card = aba.closest('.card-carta');
    if (!card) return;

    // Remove active de todas as abas do card
    const abas = card.querySelectorAll('.tab');
    abas.forEach(function (a) { a.classList.remove('tab-active'); });

    // Adiciona active na clicada
    aba.classList.add('tab-active');

    // Esconde todos os conteúdos
    const conteudos = card.querySelectorAll('.tab-content');
    conteudos.forEach(function (c) {
      c.classList.remove('tab-content-active');
      c.style.display = 'none';
    });

    // Mostra o conteúdo correspondente
    const tabName = aba.getAttribute('data-tab');
    const conteudo = card.querySelector('.tab-content[data-tab-content="' + tabName + '"]');
    if (conteudo) {
      conteudo.classList.add('tab-content-active');
      conteudo.style.display = 'block';
    }
  });
}

/* --------------------------------------------------------------
   8. LINK DE INDICAÇÃO
-------------------------------------------------------------- */
function copiarLinkIndicacao() {
  if (!usuarioAtual || !usuarioAtual.codigoRef) {
    mostrarToast('Faça login para gerar seu link.', 'error');
    return;
  }

  const link = 'https://oraculum-astrale.vercel.app/?ref=' + usuarioAtual.codigoRef;
  const inputLink = document.querySelector('[data-indicacao-link]');
  if (inputLink) inputLink.value = link;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link)
      .then(function () {
        mostrarToast('Link copiado!', 'success');
      })
      .catch(function () {
        mostrarToast('Copie manualmente: ' + link, 'info');
      });
  } else {
    // Fallback
    if (inputLink) {
      inputLink.select();
      try {
        document.execCommand('copy');
        mostrarToast('Link copiado!', 'success');
      } catch (e) {
        mostrarToast('Copie manualmente: ' + link, 'info');
      }
    }
  }
}

/* --------------------------------------------------------------
   9. ROLETA DE BÔNUS
-------------------------------------------------------------- */
let isSpinning = false;

function girarRoleta() {
  if (isSpinning) return;

  // Verifica se pode girar (24h)
  const ultimoGiro = localStorage.getItem(ROULETTE_KEY);
  if (ultimoGiro) {
    const diff = Date.now() - parseInt(ultimoGiro, 10);
    const horas = diff / (1000 * 60 * 60);
    if (horas < 24) {
      const restante = Math.ceil(24 - horas);
      mostrarToast('Volte em ' + restante + 'h para girar novamente.', 'info');
      return;
    }
  }

  isSpinning = true;

  const roleta = document.querySelector('.roleta');
  if (!roleta) {
    isSpinning = false;
    return;
  }

  // Prêmios dos setores (6 setores de 60°)
  const premios = [1, 2, 3, 5, 10, 'tente_novamente'];
  const indicePremio = Math.floor(Math.random() * premios.length);
  const premio = premios[indicePremio];

  // Calcula ângulo: setor = 60°, voltas extras 5-8
  const anguloSetor = 60;
  const voltas = 5 + Math.floor(Math.random() * 4); // 5 a 8 voltas
  const anguloExtra = Math.floor(Math.random() * anguloSetor);
  const anguloFinal = (voltas * 360) + (indicePremio * anguloSetor) + anguloExtra;

  // Aplica rotação acumulativa
  const rotacaoAtual = parseFloat(roleta.dataset.rotacao || '0');
  const novaRotacao = rotacaoAtual + anguloFinal;
  roleta.dataset.rotacao = novaRotacao;
  roleta.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  roleta.style.transform = 'rotate(' + novaRotacao + 'deg)';

  // Após 3.5s (fim da animação)
  setTimeout(function () {
    const resultadoEl = document.querySelector('[data-roleta-resultado]');

    if (premio === 'tente_novamente') {
      if (resultadoEl) resultadoEl.textContent = 'Tente novamente!';
      mostrarToast('Tente novamente amanhã!', 'info');
    } else {
      if (resultadoEl) resultadoEl.textContent = 'Você ganhou ' + premio + ' crédito(s)!';
      if (usuarioAtual) {
        usuarioAtual.creditos = (usuarioAtual.creditos || 0) + premio;
        salvarUsuarioAtual();
        atualizarHeader();
      }
      mostrarToast('Você ganhou ' + premio + ' crédito(s)!', 'success');
    }

    // Salva timestamp do giro
    localStorage.setItem(ROULETTE_KEY, String(Date.now()));

    isSpinning = false;
  }, 3500);
}

/* --------------------------------------------------------------
   12. INICIALIZAÇÃO
-------------------------------------------------------------- */
function configurarEventListeners() {
  // Botões com data-action
  document.querySelectorAll('[data-action]').forEach(function (botao) {
    botao.addEventListener('click', function (evento) {
      evento.preventDefault();
      const acao = botao.getAttribute('data-action');

      switch (acao) {
        case 'show-login':
          mostrarTela('login');
          break;
        case 'show-register':
          mostrarTela('register');
          break;
        case 'show-welcome':
          mostrarTela('welcome');
          break;
        case 'logout':
          sair();
          break;
        case 'copiar-indicacao':
          copiarLinkIndicacao();
          break;
        case 'girar-roleta':
          girarRoleta();
          break;
        default:
          break;
      }
    });
  });

  // Formulário de cadastro
  const formRegister = document.querySelector('[data-form-register]') || document.getElementById('form-register');
  if (formRegister) {
    formRegister.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      const nome = (formRegister.querySelector('[data-field-nome]') || formRegister.querySelector('#register-nome') || {}).value;
      const email = (formRegister.querySelector('[data-field-email]') || formRegister.querySelector('#register-email') || {}).value;
      const senha = (formRegister.querySelector('[data-field-senha]') || formRegister.querySelector('#register-senha') || {}).value;
      const confirmar = (formRegister.querySelector('[data-field-confirmar]') || formRegister.querySelector('#register-confirmar') || {}).value;
      await cadastrar(nome, email, senha, confirmar);
    });
  }

  // Formulário de login
  const formLogin = document.querySelector('[data-form-login]') || document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      const email = (formLogin.querySelector('[data-field-email]') || formLogin.querySelector('#login-email') || {}).value;
      const senha = (formLogin.querySelector('[data-field-senha]') || formLogin.querySelector('#login-senha') || {}).value;
      await login(email, senha);
    });
  }

  // Formulário de consulta
  const formConsulta = document.querySelector('[data-form-consulta]') || document.getElementById('form-consulta');
  if (formConsulta) {
    formConsulta.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      const pergunta = (formConsulta.querySelector('[data-field-pergunta]') || formConsulta.querySelector('#consulta-pergunta') || {}).value;
      const tipoSelect = formConsulta.querySelector('[data-field-tipo]') || formConsulta.querySelector('#consulta-tipo');
      const tipoTiragem = tipoSelect ? tipoSelect.value : '1';
      await consultar(pergunta, tipoTiragem);
    });
  }

  // Select de tipo de tiragem — atualiza custo dinamicamente
  const selectTipo = document.querySelector('[data-field-tipo]') || document.getElementById('consulta-tipo');
  if (selectTipo) {
    selectTipo.addEventListener('change', function () {
      const custo = custoTiragem(selectTipo.value);
      const custoEl = document.querySelector('[data-consulta-custo]');
      if (custoEl) custoEl.textContent = custo;
    });
  }

  // Event delegation para abas das cartas
  configurarAbasCartas();
}

/* Verifica se há sessão ativa ao carregar */
async function verificarSessao() {
  // Tenta sessionStorage primeiro
  const sessao = sessionStorage.getItem(STORAGE_KEY);
  if (sessao) {
    try {
      usuarioAtual = JSON.parse(sessao);
      atualizarHeader();
      sortearFrase();
      mostrarTela('main');
      return;
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  // Tenta Supabase session
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data && data.session && data.session.user) {
        const email = data.session.user.email;
        const { data: perfil } = await supabaseClient
          .from('perfis')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        usuarioAtual = {
          nome: perfil ? perfil.nome : email,
          email: email,
          creditos: perfil ? perfil.creditos : 5,
          streak: perfil ? perfil.streak : 0,
          ultimoLogin: dataHoje(),
          indicacoes: perfil ? perfil.indicacoes : [],
          codigoRef: gerarCodigoRef(email),
          historico: []
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioAtual));
        atualizarHeader();
        sortearFrase();
        mostrarTela('main');
        return;
      }
    } catch (e) {
      console.warn('Erro ao verificar sessão Supabase:', e);
    }
  }

  // Sem sessão — mostra welcome
  mostrarTela('welcome');
}

/* Verifica parâmetro de indicação na URL */
function verificarIndicacaoURL() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    const emailIndicador = decodificarRef(ref);
    if (emailIndicador) {
      localStorage.setItem('oraculum_astrale_ref', emailIndicador);
    }
  }
}

/* Inicialização quando o DOM estiver pronto */
document.addEventListener('DOMContentLoaded', async function () {
  verificarIndicacaoURL();
  configurarEventListeners();
  await verificarSessao();

  // Sorteia frase do dia mesmo na welcome (se o elemento existir)
  sortearFrase();

  // Atualiza custo inicial da consulta
  const selectTipo = document.querySelector('[data-field-tipo]') || document.getElementById('consulta-tipo');
  if (selectTipo) {
    const custo = custoTiragem(selectTipo.value);
    const custoEl = document.querySelector('[data-consulta-custo]');
    if (custoEl) custoEl.textContent = custo;
  }
});
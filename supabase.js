// =============================================================
// Oraculum Astrale - Configuração do Supabase
// =============================================================
// Este arquivo configura a conexão com o Supabase e expõe
// funções auxiliares para autenticação e gerenciamento de perfis.
// Deve ser carregado via tag <script> APÓS a biblioteca do Supabase.
// =============================================================

// -------------------------------------------------------------
// 1. CONFIGURAÇÃO
// -------------------------------------------------------------
// Substitua pelos valores do seu projeto Supabase
const SUPABASE_URL = 'https://ioerqutbiilatfaqwvxh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZXJxdXRiaWlsYXRmYXF3dnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODQ5NzYsImV4cCI6MjA5OTQ2MDk3Nn0.ZdqkLqKbXNMeIAz40NJS8s78_vsFZG74e8rz8VRQQso'

// Flag de ambiente: defina como true apenas em desenvolvimento
const IS_DEV = false;

// -------------------------------------------------------------
// 2. INICIALIZAÇÃO
// -------------------------------------------------------------
// Cria o cliente Supabase usando a biblioteca carregada via CDN
// (window.supabase é disponibilizado por @supabase/supabase-js v2)
let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    // Expõe o cliente globalmente para o script.js usar
    window.supabaseClient = supabaseClient;
  } else {
    console.error('[Oraculum Astrale] Biblioteca do Supabase não encontrada. Verifique o CDN.');
  }
} catch (erro) {
  console.error('[Oraculum Astrale] Erro ao inicializar o cliente Supabase:', erro);
}

// -------------------------------------------------------------
// 3. FUNÇÕES AUXILIARES
// -------------------------------------------------------------

/**
 * Cria um novo usuário no Supabase Auth + insere na tabela perfis.
 * @param {string} nome - Nome completo do usuário
 * @param {string} email - E-mail do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function criarUsuario(nome, email, senha) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    // Cria o usuário no Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: senha
    });

    if (error) {
      if (IS_DEV) console.error('[criarUsuario] Erro de autenticação:', error.message);
      return { success: false, error: error.message };
    }

    const userId = data.user && data.user.id;
    if (!userId) {
      return { success: false, error: 'Usuário criado, mas ID não retornado.' };
    }

    // Insere o perfil na tabela perfis
    const { error: erroPerfil } = await supabaseClient
      .from('perfis')
      .insert([
        {
          id: userId,
          nome: nome,
          email: email,
          creditos: 5,
          streak: 0,
          indicacoes: []
        }
      ]);

    if (erroPerfil) {
      if (IS_DEV) console.error('[criarUsuario] Erro ao inserir perfil:', erroPerfil.message);
      return { success: false, error: erroPerfil.message };
    }

    if (IS_DEV) console.log('[criarUsuario] Usuário criado com sucesso:', userId);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[criarUsuario] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao criar usuário.' };
  }
}

/**
 * Autentica um usuário existente.
 * @param {string} email - E-mail do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function loginUsuario(email, senha) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      if (IS_DEV) console.error('[loginUsuario] Erro de login:', error.message);
      return { success: false, error: error.message };
    }

    // Atualiza a data do último login
    if (data.user) {
      await supabaseClient
        .from('perfis')
        .update({ ultimo_login: new Date().toISOString().slice(0, 10) })
        .eq('id', data.user.id);
    }

    if (IS_DEV) console.log('[loginUsuario] Login realizado com sucesso:', data.user && data.user.id);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[loginUsuario] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao realizar login.' };
  }
}

/**
 * Retorna os dados do perfil do usuário.
 * @param {string} userId - ID do usuário no Supabase Auth
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function getPerfil(userId) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    if (!userId) {
      return { success: false, error: 'ID do usuário não informado.' };
    }

    const { data, error } = await supabaseClient
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (IS_DEV) console.error('[getPerfil] Erro ao buscar perfil:', error.message);
      return { success: false, error: error.message };
    }

    if (IS_DEV) console.log('[getPerfil] Perfil encontrado:', data);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[getPerfil] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao buscar perfil.' };
  }
}

/**
 * Atualiza créditos de um usuário.
 * @param {string} userId - ID do usuário
 * @param {number} novosCreditos - Nova quantidade de créditos
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function atualizarCreditos(userId, novosCreditos) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    if (!userId) {
      return { success: false, error: 'ID do usuário não informado.' };
    }

    const { data, error } = await supabaseClient
      .from('perfis')
      .update({ creditos: novosCreditos })
      .eq('id', userId)
      .select();

    if (error) {
      if (IS_DEV) console.error('[atualizarCreditos] Erro ao atualizar créditos:', error.message);
      return { success: false, error: error.message };
    }

    if (IS_DEV) console.log('[atualizarCreditos] Créditos atualizados:', novosCreditos);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[atualizarCreditos] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao atualizar créditos.' };
  }
}

/**
 * Atualiza streak de um usuário.
 * @param {string} userId - ID do usuário
 * @param {number} novoStreak - Novo valor do streak
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function atualizarStreak(userId, novoStreak) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    if (!userId) {
      return { success: false, error: 'ID do usuário não informado.' };
    }

    const { data, error } = await supabaseClient
      .from('perfis')
      .update({ streak: novoStreak })
      .eq('id', userId)
      .select();

    if (error) {
      if (IS_DEV) console.error('[atualizarStreak] Erro ao atualizar streak:', error.message);
      return { success: false, error: error.message };
    }

    if (IS_DEV) console.log('[atualizarStreak] Streak atualizado:', novoStreak);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[atualizarStreak] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao atualizar streak.' };
  }
}

/**
 * Adiciona indicação ao usuário.
 * @param {string} userId - ID do usuário que indicou
 * @param {string} emailIndicado - E-mail da pessoa indicada
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function adicionarIndicacao(userId, emailIndicado) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    if (!userId) {
      return { success: false, error: 'ID do usuário não informado.' };
    }

    if (!emailIndicado) {
      return { success: false, error: 'E-mail indicado não informado.' };
    }

    // Busca o perfil atual para obter a lista de indicações
    const resultadoPerfil = await getPerfil(userId);
    if (!resultadoPerfil.success) {
      return { success: false, error: resultadoPerfil.error };
    }

    const indicacoesAtuais = Array.isArray(resultadoPerfil.data.indicacoes)
      ? resultadoPerfil.data.indicacoes
      : [];

    const novaIndicacao = {
      email: emailIndicado,
      data: new Date().toISOString()
    };

    const indicacoesAtualizadas = [...indicacoesAtuais, novaIndicacao];

    const { data, error } = await supabaseClient
      .from('perfis')
      .update({ indicacoes: indicacoesAtualizadas })
      .eq('id', userId)
      .select();

    if (error) {
      if (IS_DEV) console.error('[adicionarIndicacao] Erro ao adicionar indicação:', error.message);
      return { success: false, error: error.message };
    }

    if (IS_DEV) console.log('[adicionarIndicacao] Indicação adicionada:', emailIndicado);
    return { success: true, data: data };
  } catch (erro) {
    if (IS_DEV) console.error('[adicionarIndicacao] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao adicionar indicação.' };
  }
}

/**
 * Desconecta o usuário.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function logoutUsuario() {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Cliente Supabase não inicializado.' };
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      if (IS_DEV) console.error('[logoutUsuario] Erro ao desconectar:', error.message);
      return { success: false, error: error.message };
    }

    if (IS_DEV) console.log('[logoutUsuario] Usuário desconectado com sucesso.');
    return { success: true };
  } catch (erro) {
    if (IS_DEV) console.error('[logoutUsuario] Exceção:', erro);
    return { success: false, error: erro.message || 'Erro ao desconectar usuário.' };
  }
}

// -------------------------------------------------------------
// EXPOSIÇÃO GLOBAL
// -------------------------------------------------------------
// Expõe as funções auxiliares no window para o script.js utilizar
window.OraculumSupabase = {
  criarUsuario,
  loginUsuario,
  getPerfil,
  atualizarCreditos,
  atualizarStreak,
  adicionarIndicacao,
  logoutUsuario
};

// =============================================================
// 5. ESTRUTURA DA TABELA PERFIS (SQL para criar no Supabase)
// =============================================================
/*
CREATE TABLE perfis (
  id UUID REFERENCES auth.users PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  creditos INTEGER DEFAULT 5,
  streak INTEGER DEFAULT 0,
  ultimo_login DATE,
  indicacoes JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habilita RLS (Row Level Security)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver e editar apenas o próprio perfil
CREATE POLICY "Usuários podem selecionar próprio perfil"
  ON perfis FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON perfis FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir próprio perfil"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = id);
*/

(function () {
  let client = null;
  let initializedFor = '';
  let session = null;
  let panel = null;
  let status = null;
  let emailInput = null;
  let signInButton = null;
  let signOutButton = null;

  function currentApiUrl() {
    return (localStorage.getItem('chainos-api-url') || window.CHAINOS_API_URL || document.querySelector('meta[name="chainos-api-url"]')?.content?.trim() || '').replace(/\/$/, '');
  }

  function setStatus(message, state = '') {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function ensurePanel() {
    if (panel) return;
    const parent = document.querySelector('.api-connection');
    if (!parent) return;
    panel = document.createElement('section');
    panel.className = 'supabase-auth';
    panel.innerHTML = '<div class="supabase-auth-title">WORKSPACE SIGN-IN</div><label for="supabase-email">Email address</label><input id="supabase-email" type="email" autocomplete="email" placeholder="you@company.com"><div class="supabase-auth-actions"><button id="supabase-sign-in" type="button">Send sign-in link</button><button id="supabase-sign-out" type="button" hidden>Sign out</button></div><div id="supabase-auth-status" class="supabase-auth-status" role="status" aria-live="polite"></div>';
    parent.append(panel);
    status = panel.querySelector('#supabase-auth-status');
    emailInput = panel.querySelector('#supabase-email');
    signInButton = panel.querySelector('#supabase-sign-in');
    signOutButton = panel.querySelector('#supabase-sign-out');
    signInButton.addEventListener('click', sendSignInLink);
    signOutButton.addEventListener('click', signOut);
  }

  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let script = document.getElementById('supabase-js-sdk');
      if (script?.dataset.loaded === 'true') return resolve();
      if (script?.dataset.failed === 'true') return reject(new Error('Supabase sign-in library could not be loaded.'));
      if (!script) {
        script = document.createElement('script');
        script.id = 'supabase-js-sdk';
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        document.head.append(script);
      }
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
      script.addEventListener('error', () => { script.dataset.failed = 'true'; reject(new Error('Supabase sign-in library could not be loaded.')); }, { once: true });
    });
  }

  async function refreshIdentity(baseUrl) {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' } });
      if (!response.ok) throw new Error(response.status === 503 ? 'Workspace access check is temporarily unavailable.' : 'Could not verify workspace membership.');
      const identity = await response.json();
      if (identity.role) setStatus(`Signed in as ${identity.user.email || 'your account'} · ${identity.role}.`, 'success');
      else if (identity.accessControlEnabled) setStatus(`Signed in as ${identity.user.email || 'your account'}, but no workspace access is assigned yet.`, 'warning');
      else setStatus(`Signed in as ${identity.user.email || 'your account'}.`, 'success');
    } catch (error) {
      setStatus(error.message || 'Could not verify your account.', 'warning');
    }
  }

  async function sendSignInLink() {
    const email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) {
      setStatus('Enter a valid email address.', 'warning');
      emailInput.focus();
      return;
    }
    signInButton.disabled = true;
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      setStatus('If this address is eligible, a sign-in link is on its way. Check your inbox.', 'success');
    } catch (error) {
      setStatus(error.message || 'Could not send a sign-in link.', 'warning');
    } finally {
      signInButton.disabled = false;
    }
  }

  async function signOut() {
    signOutButton.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      session = null;
      setStatus('Signed out. The public demo fixture remains available.', '');
      await window.chainosReloadFixture?.();
    } catch (error) {
      setStatus(error.message || 'Could not sign out.', 'warning');
    } finally {
      signOutButton.disabled = false;
    }
  }

  async function init(baseUrl = currentApiUrl()) {
    if (!baseUrl) return;
    if (initializedFor === baseUrl) {
      if (session?.access_token) await refreshIdentity(baseUrl);
      return;
    }
    initializedFor = baseUrl;
    ensurePanel();
    if (!panel) return;
    setStatus('Checking Supabase Auth configuration…');
    try {
      const configResponse = await fetch(`${baseUrl}/api/auth/config`, { headers: { Accept: 'application/json' } });
      if (!configResponse.ok) throw new Error(`Auth configuration returned ${configResponse.status}.`);
      const config = await configResponse.json();
      if (!config.enabled) {
        setStatus('Supabase Auth is not configured on this API yet.');
        return;
      }
      await loadSdk();
      client = window.supabase.createClient(config.supabaseUrl, config.anonKey);
      window.chainosApiAccessToken = async () => {
        const { data } = await client.auth.getSession();
        session = data.session;
        return session?.access_token || null;
      };
      signInButton.hidden = false;
      signOutButton.hidden = true;
      client.auth.onAuthStateChange((event, nextSession) => {
        session = nextSession;
        const signedIn = Boolean(session?.access_token);
        signInButton.hidden = signedIn;
        signOutButton.hidden = !signedIn;
        emailInput.hidden = signedIn;
        if (signedIn) {
          setStatus('Checking workspace access…');
          void refreshIdentity(baseUrl);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            void window.chainosReloadFixture?.();
          }
        } else if (event === 'SIGNED_OUT') {
          setStatus('Signed out. The public demo fixture remains available.');
          void window.chainosReloadFixture?.();
        } else setStatus('Enter your email to request a secure sign-in link.');
      });
      const { data } = await client.auth.getSession();
      session = data.session;
      if (session) {
        signInButton.hidden = true;
        signOutButton.hidden = false;
        emailInput.hidden = true;
        await refreshIdentity(baseUrl);
      } else setStatus('Enter your email to request a secure sign-in link.');
    } catch (error) {
      setStatus(error.message || 'Could not initialize Supabase Auth.', 'warning');
    }
  }

  window.chainosApiAuthInit = init;
  const savedApiUrl = currentApiUrl();
  if (savedApiUrl) void init(savedApiUrl);
}());

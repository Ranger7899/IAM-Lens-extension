/* IAM Lens OAuth callback (IAM-79). Same-origin, no network requests: reads the URL fragment, clears it, and
 * forwards it to the extension with chrome.runtime.sendMessage. Nothing is stored or logged. */
(function () {
  'use strict';
  var EXTENSION_ID = 'odnpdglkmklhecdmggaebgakadfciooc';
  var KEYS = ['access_token', 'expires_in', 'scope', 'state', 'error'];

  /** Picks the known keys out of a URL fragment ("#a=b&c=d"). Unknown keys are dropped. */
  function parseFragment(hash) {
    var out = {};
    var q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    KEYS.forEach(function (k) {
      var v = q.get(k);
      if (v !== null) out[k] = v;
    });
    return out;
  }

  function show(title, text, isError) {
    document.getElementById('title').textContent = title;
    var m = document.getElementById('msg');
    m.textContent = text;
    m.className = isError ? 'note error' : 'note';
    m.setAttribute('role', isError ? 'alert' : 'status');
  }

  function run() {
    var params = parseFragment(location.hash);
    // Clear the token from the address bar and history immediately.
    history.replaceState(null, '', location.pathname);

    if (!params.state || (!params.access_token && !params.error)) {
      show('Nothing to sign in', 'This page is only used while signing in from the IAM Lens extension.', true);
      return;
    }
    var rt = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
    if (!rt || typeof rt.sendMessage !== 'function') {
      show(
        'IAM Lens was not found',
        'Open this page in a browser where the IAM Lens extension is installed, then start sign-in from its options page.',
        true,
      );
      return;
    }
    try {
      rt.sendMessage(EXTENSION_ID, { type: 'iam-lens-oauth', params: params }, function (res) {
        var lastErr = rt.lastError; // read it so Chrome does not log an unchecked error
        if (lastErr || !res || res.ok !== true) {
          if (params.error) {
            show('Sign-in failed', 'Google returned: ' + params.error, true);
          } else {
            show(
              'Sign-in not completed',
              'The extension did not accept this sign-in. Go back to IAM Lens and start again.',
              true,
            );
          }
          return;
        }
        show('Signed in', 'Signed in. You can close this tab.', false);
      });
    } catch {
      show('IAM Lens was not found', 'Could not reach the IAM Lens extension.', true);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseFragment: parseFragment };
  } else {
    run();
  }
})();

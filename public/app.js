document.getElementById('signup-btn').addEventListener('click', signup);

async function signup() {
  const email = document.getElementById('email').value.trim();
  const resultEl = document.getElementById('signup-result');
  if (!email) { resultEl.textContent = 'Enter an email first.'; return; }

  resultEl.textContent = 'Creating key...';
  try {
    const res = await fetch('/v1/developers/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { resultEl.textContent = 'Error: ' + (data.error || 'signup failed'); return; }
    resultEl.textContent = 'Your key: ' + data.key + '  (tier: ' + data.tier + ')';
  } catch (err) {
    resultEl.textContent = 'Network error — is the API server running?';
  }
}

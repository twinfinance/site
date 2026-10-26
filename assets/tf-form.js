window.TF_FORM = {
  ENDPOINT: '',
};

(() => {
  function bind(form) {
    const status = form.querySelector('.status');
    const btn = form.querySelector('button[type="submit"]');
    function show(kind, text) { status.className = 'status ' + kind; status.textContent = text; status.hidden = false; }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const { ENDPOINT } = window.TF_FORM;
      if (!ENDPOINT) { show('warn', 'Prévia: o envio ainda não está ligado. Nada foi enviado.'); return; }
      btn.disabled = true;
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) })
        .then(r => r.json())
        .then(r => {
          if (!r.ok) throw new Error(r.erro);
          form.reset();
          show('ok', 'Recebido. O time da TwinFinance entra em contato pelo e-mail informado.');
        })
        .catch(() => show('warn', 'Não foi possível enviar agora. Tente de novo em alguns minutos.'))
        .finally(() => { btn.disabled = false; });
    });
  }
  document.querySelectorAll('form[data-lead]').forEach(bind);
})();

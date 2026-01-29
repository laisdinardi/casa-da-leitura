console.log("SCRIPT.JS CARREGADO");

document.addEventListener("DOMContentLoaded", () => {
  // Spoiler buttons (se existir em alguma página)
  document.querySelectorAll(".spoiler-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.nextElementSibling;
      if (text) text.classList.toggle("visible");
    });
  });

  // Language switch (PT / EN)
  (function () {
    const wrapper = document.querySelector(".lang");
    const btnPT = document.getElementById("btn-pt");
    const btnEN = document.getElementById("btn-en");

    if (!wrapper || !btnPT || !btnEN) return;

    function setLang(lang) {
      if (lang === "pt") {
        wrapper.classList.add("is-pt");
        wrapper.classList.remove("is-en");
        btnPT.classList.add("active");
        btnEN.classList.remove("active");
        document.documentElement.lang = "pt-BR";
        localStorage.setItem("cdl_lang", "pt");
      } else {
        wrapper.classList.add("is-en");
        wrapper.classList.remove("is-pt");
        btnEN.classList.add("active");
        btnPT.classList.remove("active");
        document.documentElement.lang = "en";
        localStorage.setItem("cdl_lang", "en");
      }
    }

    btnPT.addEventListener("click", () => setLang("pt"));
    btnEN.addEventListener("click", () => setLang("en"));

    const saved = localStorage.getItem("cdl_lang");
    setLang(saved === "en" ? "en" : "pt");
  })();

  // Club form (envia pro backend)
  (function () {
    const form = document.getElementById("club-form");
    if (!form) return;

    const status = document.getElementById("club-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = (form.elements.name?.value || "").trim();
      const email = (form.elements.email?.value || "").trim();

      const lang = document.documentElement.lang?.startsWith("en") ? "en" : "pt";

      if (!email) return;

      if (status) status.textContent = lang === "en" ? "Sending..." : "Enviando...";

      try {
        const res = await fetch("/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, lang }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.ok === false) {
          const msg = data.error || (lang === "en" ? "Could not subscribe." : "Não foi possível se inscrever.");
          if (status) status.textContent = msg;
          return;
        }

        if (status) {
          status.textContent =
            data.duplicated
              ? (lang === "en" ? "You are already subscribed. We sent the email again." : "Você já estava inscrita. Enviamos o email de novo.")
              : (lang === "en" ? "Done! Check your email." : "Pronto! Confira seu email.");
        }

        form.reset();
      } catch (err) {
        if (status) status.textContent = lang === "en" ? "Connection error." : "Erro de conexão.";
      }
    });
  })();
});
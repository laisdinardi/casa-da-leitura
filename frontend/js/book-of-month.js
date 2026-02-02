async function fetchBook() {
  const res = await fetch("/api/book");
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Erro ao buscar livro");
  return json.book;
}

function getLang() {
  return localStorage.getItem("cdl_lang") === "en" ? "en" : "pt";
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-book-root]");
  if (!root) return;

  try {
    const book = await fetchBook();
    const lang = getLang();
    const b = book[lang];

    root.querySelector("[data-book-title]").textContent = b.title;
    root.querySelector("[data-book-author]").textContent = b.author;
    root.querySelector("[data-book-line]").textContent = b.line;

    const q = root.querySelectorAll("[data-book-q]");
    q.forEach((el, i) => (el.textContent = b.questions[i] || ""));

    const img = root.querySelector("[data-book-img]");
    if (img && book.image) img.src = `/${book.image}`;
  } catch (e) {
    console.log(e);
  }
});
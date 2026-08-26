/*
 * Runtime YSD para decks derivados de lições canônicas.
 *
 * Origem: presentations/templates/theme/ysd-deck.js
 * Distribuição: tools/sync_deck_theme.rb copia este arquivo para
 *               presentations/decks/<microtema>/assets/theme/ysd-deck.js
 * Não editar a cópia dentro do deck: ela é artefato derivado.
 *
 * O runtime cuida apenas de navegação, foco e retorno visual genérico.
 * Ele nunca guarda resposta, nota, acerto ou tempo: o registro pedagógico
 * pertence aos eventos de sessão (sessions/), não ao artefato de apresentação.
 */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  var current = 0;

  /* Só a partir daqui o CSS pode esconder conteúdo para revelá-lo depois.
     Antes disso o deck é legível sem script. */
  document.documentElement.classList.add("deck-ready");

  var bar = document.querySelector("#progressBar");
  var counter = document.querySelector("#counter");
  var dots = document.querySelector("#dots");
  var map = document.querySelector("#slideMap");

  /* ------------------------------------------------------- navegação */

  function label(slide, index) {
    var heading = slide.querySelector("h1, h2");
    return heading ? heading.textContent.trim() : "Slide " + (index + 1);
  }

  function render(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));

    slides.forEach(function (slide, i) {
      slide.classList.toggle("is-current", i === current);
    });

    if (counter) counter.textContent = current + 1 + " / " + slides.length;
    if (bar) bar.style.width = ((current + 1) / slides.length) * 100 + "%";

    if (dots) {
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        dot.setAttribute("aria-current", i === current ? "true" : "false");
      });
    }
  }

  function goTo(index, focus) {
    render(index);
    slides[current].scrollIntoView({
      behavior: reduced.matches ? "auto" : "smooth",
      block: "start"
    });
    if (focus) {
      slides[current].setAttribute("tabindex", "-1");
      slides[current].focus({ preventScroll: true });
    }
  }

  function step(delta) {
    goTo(current + delta, false);
  }

  if (dots) {
    slides.forEach(function (slide, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Ir para o slide " + (index + 1) + ": " + label(slide, index));
      dot.addEventListener("click", function () { goTo(index, true); });
      dots.appendChild(dot);
    });
  }

  var previous = document.querySelector("#previous");
  var next = document.querySelector("#next");
  if (previous) previous.addEventListener("click", function () { step(-1); });
  if (next) next.addEventListener("click", function () { step(1); });

  /* Mapa de slides: alternativa não sequencial de acesso ao conteúdo. */
  function closeMap() {
    if (!map) return;
    map.removeAttribute("open");
    var toggle = document.querySelector("#mapToggle");
    if (toggle) toggle.focus();
  }

  function openMap() {
    if (!map) return;
    map.setAttribute("open", "");
    var first = map.querySelector("button");
    if (first) first.focus();
  }

  if (map) {
    var list = map.querySelector("ol");
    slides.forEach(function (slide, index) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.innerHTML = "<small>" + (index + 1) + " / " + slides.length + "</small>";
      button.appendChild(document.createTextNode(label(slide, index)));
      button.addEventListener("click", function () {
        closeMap();
        goTo(index, true);
      });
      item.appendChild(button);
      list.appendChild(item);
    });

    map.addEventListener("click", function (event) {
      if (event.target === map) closeMap();
    });

    var toggleButton = document.querySelector("#mapToggle");
    if (toggleButton) {
      toggleButton.addEventListener("click", function () {
        if (map.hasAttribute("open")) closeMap(); else openMap();
      });
    }
  }

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    var typing = /^(input|textarea|select)$/i.test(event.target.tagName);
    if (typing) return;

    if (event.key === "Escape") { closeMap(); return; }
    if (event.key === "g" || event.key === "G") {
      event.preventDefault();
      if (map && map.hasAttribute("open")) closeMap(); else openMap();
      return;
    }
    if (["ArrowDown", "ArrowRight", "PageDown", " "].indexOf(event.key) >= 0) {
      event.preventDefault();
      step(1);
    }
    if (["ArrowUp", "ArrowLeft", "PageUp"].indexOf(event.key) >= 0) {
      event.preventDefault();
      step(-1);
    }
    if (event.key === "Home") { event.preventDefault(); goTo(0, true); }
    if (event.key === "End") { event.preventDefault(); goTo(slides.length - 1, true); }
  });

  /* Gesto vertical no celular, sem capturar rolagem normal nem toque em botão. */
  var touchStartY = null;
  var touchStartX = null;
  document.addEventListener("touchstart", function (event) {
    if (event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  document.addEventListener("touchend", function (event) {
    if (touchStartY === null) return;
    var deltaY = event.changedTouches[0].clientY - touchStartY;
    var deltaX = event.changedTouches[0].clientX - touchStartX;
    touchStartY = null;
    touchStartX = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) return;
    if (Math.abs(deltaY) < 90) return;
    step(deltaY < 0 ? 1 : -1);
  }, { passive: true });

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) render(slides.indexOf(entry.target));
    });
  }, { threshold: 0.55 });
  slides.forEach(function (slide) { watcher.observe(slide); });

  /* ------------------------------------------------- interação genérica */

  /*
   * Escolha com retorno explicativo. O deck declara a semântica no HTML:
   *   <div data-question>
   *     <button data-choice="correct" data-message="...">…</button>
   *     <button data-choice="wrong" data-message="...">…</button>
   *     <p class="feedback" data-feedback>…</p>
   *   </div>
   * O runtime só aplica estado visual e o texto declarado; ele não decide
   * o que é correto nem registra resultado.
   */
  document.querySelectorAll("[data-question]").forEach(function (block) {
    var feedback = block.querySelector("[data-feedback]");
    block.querySelectorAll("[data-choice]").forEach(function (button) {
      button.addEventListener("click", function () {
        var correct = button.dataset.choice === "correct";
        button.classList.remove("correct", "wrong");
        button.classList.add(correct ? "correct" : "wrong");
        if (!feedback) return;
        feedback.textContent = button.dataset.message || "";
        feedback.classList.toggle("ok", correct);
        feedback.classList.toggle("err", !correct);
      });
    });
  });

  /*
   * Grupo de seleção mutuamente exclusiva. Emite `ysd:select` com o valor,
   * para o deck aplicar o efeito visual específico do conceito ensinado.
   */
  document.querySelectorAll("[data-select-group]").forEach(function (group) {
    var buttons = group.querySelectorAll("[data-value]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        buttons.forEach(function (item) { item.classList.remove("active"); });
        button.classList.add("active");
        group.dispatchEvent(new CustomEvent("ysd:select", {
          bubbles: true,
          detail: { value: button.dataset.value }
        }));
      });
    });
  });

  /* Mensagem simples disparada por botão, sem estado de acerto. */
  document.querySelectorAll("[data-says]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.querySelector(button.dataset.saysTarget);
      if (target) target.textContent = button.dataset.says;
    });
  });

  /* Link direto para um slide (…/index.html#slide-4) sobrevive ao carregamento.
     Sem isso, o link compartilhado cairia sempre na primeira tela. */
  function startIndex() {
    var hash = window.location.hash.replace("#", "");
    if (!hash) return 0;
    var found = slides.findIndex(function (slide) { return slide.id === hash; });
    return found >= 0 ? found : 0;
  }

  var start = startIndex();
  render(start);
  if (start > 0) {
    /* Salto imediato, sem rolagem animada: um link compartilhado deve abrir já
       na tela pedida, e não percorrer a aula inteira na frente do aluno. */
    window.requestAnimationFrame(function () {
      slides[start].scrollIntoView({ behavior: "auto", block: "start" });
    });
  }

  window.YSDDeck = {
    goTo: goTo,
    step: step,
    total: slides.length,
    current: function () { return current; }
  };
})();

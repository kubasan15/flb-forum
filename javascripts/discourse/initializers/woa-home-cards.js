import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
  const applyCardAttributes = () => {
    document.querySelectorAll("[data-woa-card]").forEach((card) => {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "link");
    });
  };

  const handleCardClick = (event) => {
    const card = event.target.closest("[data-woa-card]");
    if (!card || event.target.closest("a")) {
      return;
    }

    const href = card.getAttribute("data-href");
    if (href && href !== "#") {
      window.location.href = href;
    }
  };

  const handleCardKeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const card = event.target.closest("[data-woa-card]");
    if (!card || event.target.closest("a")) {
      return;
    }

    event.preventDefault();
    const href = card.getAttribute("data-href");
    if (href && href !== "#") {
      window.location.href = href;
    }
  };

  applyCardAttributes();
  document.addEventListener("click", handleCardClick);
  document.addEventListener("keydown", handleCardKeydown);

  api.onPageChange(() => {
    applyCardAttributes();
  });
});

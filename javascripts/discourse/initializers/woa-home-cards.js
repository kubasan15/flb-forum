import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("0.11.1", (api) => {
  const applyCardAttributes = () => {
    document.querySelectorAll("[data-woa-card]").forEach((card) => {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "link");
    });
  };

  const renderAnnouncements = async () => {
    const container = document.querySelector("[data-woa-announcements]");
    if (!container) {
      return;
    }

    const list = container.querySelector(".woa-home-announcements__list");
    if (!list) {
      return;
    }

    const tag = container.getAttribute("data-tag") || "announcement";
    const limit = Number(container.getAttribute("data-limit") || 5);
    list.innerHTML = "";

    try {
      const response = await ajax(`/tag/${encodeURIComponent(tag)}.json?order=created&ascending=false`);
      const topics = response?.topic_list?.topics || [];
      topics.slice(0, limit).forEach((topic) => {
        const fallbackUrl =
          topic?.slug && topic?.id ? `/t/${topic.slug}/${topic.id}` : topic?.id ? `/t/${topic.id}` : null;
        const rawUrl = topic?.relative_url || topic?.url || fallbackUrl;
        const topicUrl = rawUrl === "undefined" ? fallbackUrl : rawUrl;
        if (!topicUrl) {
          return;
        }

        const link = document.createElement("a");
        link.className = "woa-home-announcement";
        link.href = topicUrl;

        const title = document.createElement("div");
        title.className = "woa-home-announcement__title";
        title.textContent = topic.title;

        const meta = document.createElement("div");
        meta.className = "woa-home-announcement__meta";
        if (topic.category_id && response?.category_list?.categories) {
          const category = response.category_list.categories.find((item) => item.id === topic.category_id);
          if (category) {
            meta.textContent = category.name;
          }
        }

        link.appendChild(title);
        link.appendChild(meta);
        list.appendChild(link);
      });
    } catch (error) {
      const fallback = document.createElement("div");
      fallback.className = "woa-home-announcement__meta";
      fallback.textContent = "Announcements are loading...";
      list.appendChild(fallback);
    }
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
  renderAnnouncements();
  document.addEventListener("click", handleCardClick);
  document.addEventListener("keydown", handleCardKeydown);

  api.onPageChange(() => {
    applyCardAttributes();
    renderAnnouncements();
  });
});

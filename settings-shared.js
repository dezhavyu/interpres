(function () {
  const SETTINGS_VERSION = 3;
  const LANGUAGES = [
    "Arabic",
    "Armenian",
    "Azerbaijani",
    "Basque",
    "Belarusian",
    "Bengali",
    "Bosnian",
    "Bulgarian",
    "Catalan",
    "Chinese",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "English",
    "Estonian",
    "Finnish",
    "French",
    "Georgian",
    "German",
    "Greek",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Icelandic",
    "Indonesian",
    "Irish",
    "Italian",
    "Japanese",
    "Kazakh",
    "Korean",
    "Latvian",
    "Lithuanian",
    "Macedonian",
    "Malay",
    "Norwegian",
    "Persian",
    "Polish",
    "Portuguese",
    "Romanian",
    "Russian",
    "Serbian",
    "Slovak",
    "Slovenian",
    "Spanish",
    "Swedish",
    "Tamil",
    "Thai",
    "Turkish",
    "Ukrainian",
    "Urdu",
    "Vietnamese"
  ];
  const DEFAULT_SETTINGS = {
    targetLanguage: "English",
    explanationLanguage: "English",
    settingsVersion: SETTINGS_VERSION
  };

  function initInterpresSettings({ mode }) {
    const form = document.getElementById("settings-form");
    const statusElement = document.getElementById("status");
    const targetLanguagePicker = createLanguagePicker("targetLanguage");
    const explanationLanguagePicker = createLanguagePicker("explanationLanguage");

    if (!form || !statusElement || !targetLanguagePicker || !explanationLanguagePicker) {
      return;
    }

    restoreSettings();
    form.addEventListener("submit", handleSubmit);
    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);

    async function restoreSettings() {
      const settings = await getStorageItems(DEFAULT_SETTINGS);
      const migratedSettings = await migrateLegacySettingsIfNeeded(settings);
      const targetLanguage =
        normalizeText(migratedSettings.targetLanguage) || DEFAULT_SETTINGS.targetLanguage;
      const explanationLanguage =
        normalizeText(migratedSettings.explanationLanguage) ||
        targetLanguage ||
        DEFAULT_SETTINGS.explanationLanguage;

      targetLanguagePicker.setValue(targetLanguage);
      explanationLanguagePicker.setValue(explanationLanguage);
    }

    async function handleSubmit(event) {
      event.preventDefault();

      const targetLanguage = targetLanguagePicker.getValue() || DEFAULT_SETTINGS.targetLanguage;
      const explanationLanguage = explanationLanguagePicker.getValue() || targetLanguage;

      await setStorageItems({
        targetLanguage,
        explanationLanguage,
        settingsVersion: SETTINGS_VERSION
      });

      targetLanguagePicker.setValue(targetLanguage);
      explanationLanguagePicker.setValue(explanationLanguage);

      statusElement.textContent = mode === "popup" ? "Saved" : "Settings saved";
      window.setTimeout(() => {
        statusElement.textContent = "";
      }, 1800);
    }

    function handleDocumentPointerDown(event) {
      targetLanguagePicker.handleOuterPointer(event);
      explanationLanguagePicker.handleOuterPointer(event);
    }

    function handleDocumentKeydown(event) {
      if (event.key !== "Escape") {
        return;
      }

      targetLanguagePicker.close();
      explanationLanguagePicker.close();
    }
  }

  function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function getStorageItems(defaults) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaults, resolve);
    });
  }

  function setStorageItems(items) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, resolve);
    });
  }

  async function migrateLegacySettingsIfNeeded(settings) {
    const targetLanguage = normalizeText(settings?.targetLanguage) || DEFAULT_SETTINGS.targetLanguage;
    const explanationLanguage =
      normalizeText(settings?.explanationLanguage) || targetLanguage || DEFAULT_SETTINGS.explanationLanguage;
    const settingsVersion = Number(settings?.settingsVersion || 0);

    const shouldResetToEnglishDefaults = settingsVersion < SETTINGS_VERSION;

    const normalizedSettings = shouldResetToEnglishDefaults
      ? {
          targetLanguage: "English",
          explanationLanguage: "English",
          settingsVersion: SETTINGS_VERSION
        }
      : {
          targetLanguage,
          explanationLanguage,
          settingsVersion: SETTINGS_VERSION
        };

    if (
      settingsVersion !== normalizedSettings.settingsVersion ||
      targetLanguage !== normalizedSettings.targetLanguage ||
      explanationLanguage !== normalizedSettings.explanationLanguage
    ) {
      await setStorageItems(normalizedSettings);
    }

    return normalizedSettings;
  }

  function createLanguagePicker(settingName) {
    const root = document.querySelector(`[data-setting="${settingName}"]`);
    if (!root) {
      return null;
    }

    const trigger = root.querySelector(".settings-picker-trigger");
    const valueElement = root.querySelector(".settings-picker-value");
    const popover = root.querySelector(".settings-picker-popover");
    const searchInput = root.querySelector(".settings-picker-search");
    const list = root.querySelector(".settings-picker-list");

    if (!trigger || !valueElement || !popover || !searchInput || !list) {
      return null;
    }

    let selectedValue = DEFAULT_SETTINGS[settingName] || "English";
    let filteredLanguages = [...LANGUAGES];

    renderOptions();

    trigger.addEventListener("click", () => {
      if (popover.hidden) {
        open();
        return;
      }

      close();
    });

    searchInput.addEventListener("input", () => {
      const query = normalizeText(searchInput.value).toLowerCase();
      filteredLanguages = query
        ? LANGUAGES.filter((language) => language.toLowerCase().includes(query))
        : [...LANGUAGES];
      renderOptions();
    });

    list.addEventListener("click", (event) => {
      const optionButton = event.target.closest("[data-language]");
      if (!optionButton) {
        return;
      }

      setValue(optionButton.dataset.language || selectedValue);
      close();
    });

    function renderOptions() {
      list.replaceChildren();

      for (const language of filteredLanguages) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "settings-picker-option";
        option.dataset.language = language;
        option.textContent = language;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(language === selectedValue));

        if (language === selectedValue) {
          option.classList.add("is-selected");
        }

        list.appendChild(option);
      }

      if (!filteredLanguages.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "settings-picker-empty";
        emptyState.textContent = "No languages found";
        list.appendChild(emptyState);
      }
    }

    function setValue(value) {
      const normalized = normalizeText(value);
      selectedValue = LANGUAGES.includes(normalized) ? normalized : "English";
      valueElement.textContent = selectedValue;
      filteredLanguages = [...LANGUAGES];
      searchInput.value = "";
      renderOptions();
    }

    function getValue() {
      return selectedValue;
    }

    function open() {
      popover.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      root.classList.add("is-open");
      root.classList.remove("is-open-up");
      filteredLanguages = [...LANGUAGES];
      searchInput.value = "";
      renderOptions();
      updatePopoverDirection();
      window.setTimeout(() => {
        searchInput.focus();
      }, 0);
    }

    function close() {
      popover.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      root.classList.remove("is-open");
      root.classList.remove("is-open-up");
      searchInput.value = "";
      filteredLanguages = [...LANGUAGES];
    }

    function handleOuterPointer(event) {
      if (!root.classList.contains("is-open")) {
        return;
      }

      if (root.contains(event.target)) {
        return;
      }

      close();
    }

    function updatePopoverDirection() {
      const triggerRect = trigger.getBoundingClientRect();
      const popoverHeight = popover.offsetHeight || 280;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const shouldOpenUp =
        spaceBelow < Math.min(popoverHeight + 12, 220) && spaceAbove > spaceBelow;

      root.classList.toggle("is-open-up", shouldOpenUp);
    }

    return {
      setValue,
      getValue,
      close,
      handleOuterPointer
    };
  }

  window.initInterpresSettings = initInterpresSettings;
})();

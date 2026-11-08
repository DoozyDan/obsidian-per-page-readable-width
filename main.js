/*
 * Per-Page Readable Width (per-page-readable-width)
 * Disable Readable Line Length (enable Full Width) on specific pages
 * while keeping global Readable Line Length enabled across the rest of your vault.
 */

"use strict";

const obsidian = require("obsidian");

const DEFAULT_SETTINGS = {
  fullWidthPages: ["Notes/Budget.md"],
  fullWidthFolders: [],
  respectFrontmatter: true,
  showHeaderButton: true
};

class PerPageReadableWidthSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Per-Page Readable Width" });

    new obsidian.Setting(containerEl)
      .setName("Show Toggle Button in Note Header")
      .setDesc("Adds a 1-click Full Width toggle icon in the top-right header of every note.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showHeaderButton !== false)
          .onChange(async (val) => {
            this.plugin.settings.showHeaderButton = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllLeaves();
          })
      );

    new obsidian.Setting(containerEl)
      .setName("Respect Note Frontmatter")
      .setDesc("Also disable readable line length on any note with frontmatter `wide: true`, `full-width: true`, or `readable-line-length: false`.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.respectFrontmatter !== false)
          .onChange(async (val) => {
            this.plugin.settings.respectFrontmatter = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllLeaves();
          })
      );

    containerEl.createEl("h3", { text: "Full-Width Pages (Readable Line Length Off)" });

    let newPagePath = "";
    new obsidian.Setting(containerEl)
      .setName("Add Page Path")
      .setDesc("Enter the vault path of a note (e.g. Notes/Budget.md) to disable readable line length on that page.")
      .addText((text) => {
        text.setPlaceholder("Notes/Budget.md").onChange((v) => {
          newPagePath = v.trim();
        });
      })
      .addButton((btn) => {
        btn
          .setButtonText("Add Page")
          .setCta()
          .onClick(async () => {
            if (!newPagePath) return;
            const normalized = obsidian.normalizePath(newPagePath);
            if (!this.plugin.settings.fullWidthPages.includes(normalized)) {
              this.plugin.settings.fullWidthPages.push(normalized);
              await this.plugin.saveSettings();
              this.plugin.refreshAllLeaves();
              this.display();
            }
          });
      });

    const pagesList = containerEl.createDiv();
    if (this.plugin.settings.fullWidthPages.length === 0) {
      pagesList.createEl("p", {
        text: "No full-width pages configured yet.",
        cls: "setting-item-description"
      });
    } else {
      for (const pagePath of this.plugin.settings.fullWidthPages) {
        new obsidian.Setting(pagesList)
          .setName(pagePath)
          .addButton((btn) =>
            btn
              .setButtonText("Remove")
              .setWarning()
              .onClick(async () => {
                this.plugin.settings.fullWidthPages =
                  this.plugin.settings.fullWidthPages.filter((p) => p !== pagePath);
                await this.plugin.saveSettings();
                this.plugin.refreshAllLeaves();
                this.display();
              })
          );
      }
    }

    containerEl.createEl("h3", { text: "Full-Width Folders" });

    let newFolderPath = "";
    new obsidian.Setting(containerEl)
      .setName("Add Folder Path")
      .setDesc("Disable readable line length for all notes inside a folder (e.g. Dashboards).")
      .addText((text) => {
        text.setPlaceholder("Folder/Path").onChange((v) => {
          newFolderPath = v.trim();
        });
      })
      .addButton((btn) => {
        btn
          .setButtonText("Add Folder")
          .onClick(async () => {
            if (!newFolderPath) return;
            const normalized = obsidian.normalizePath(newFolderPath).replace(/\/+$/, "");
            if (!this.plugin.settings.fullWidthFolders.includes(normalized)) {
              this.plugin.settings.fullWidthFolders.push(normalized);
              await this.plugin.saveSettings();
              this.plugin.refreshAllLeaves();
              this.display();
            }
          });
      });

    const foldersList = containerEl.createDiv();
    for (const folderPath of this.plugin.settings.fullWidthFolders) {
      new obsidian.Setting(foldersList)
        .setName(folderPath)
        .addButton((btn) =>
          btn
            .setButtonText("Remove")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.fullWidthFolders =
                this.plugin.settings.fullWidthFolders.filter((f) => f !== folderPath);
              await this.plugin.saveSettings();
              this.plugin.refreshAllLeaves();
              this.display();
            })
        );
    }
  }
}

class PerPageReadableWidthPlugin extends obsidian.Plugin {
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    if (!Array.isArray(this.settings.fullWidthPages)) {
      this.settings.fullWidthPages = ["Notes/Budget.md"];
    }
    if (!Array.isArray(this.settings.fullWidthFolders)) {
      this.settings.fullWidthFolders = [];
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isFileFullWidth(file) {
    if (!file || !file.path) return false;
    const normPath = obsidian.normalizePath(file.path);

    if (this.settings.fullWidthPages.includes(normPath)) {
      return true;
    }

    for (const folder of this.settings.fullWidthFolders) {
      const cleanFolder = obsidian.normalizePath(folder).replace(/\/+$/, "");
      if (normPath.startsWith(`${cleanFolder}/`)) {
        return true;
      }
    }

    if (this.settings.respectFrontmatter) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (fm) {
        if (
          fm.wide === true ||
          fm["full-width"] === true ||
          fm.fullWidth === true ||
          fm["readable-line-length"] === false ||
          fm.readableLineLength === false
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async togglePageFullWidth(file) {
    if (!file || !file.path) return;
    const normPath = obsidian.normalizePath(file.path);
    const idx = this.settings.fullWidthPages.indexOf(normPath);
    let enabledFullWidth = false;

    if (idx >= 0) {
      this.settings.fullWidthPages.splice(idx, 1);
      enabledFullWidth = false;
    } else {
      this.settings.fullWidthPages.push(normPath);
      enabledFullWidth = true;
    }

    await this.saveSettings();
    this.refreshAllLeaves();
    new obsidian.Notice(
      enabledFullWidth
        ? `Full Width enabled (Readable line length OFF) for "${file.basename}"`
        : `Readable line length restored for "${file.basename}"`
    );
  }

  applyWidthToMarkdownView(view) {
    if (!view || !(view instanceof obsidian.MarkdownView)) return;
    const file = view.file;
    const fullWidth = this.isFileFullWidth(file);
    const globalReadable = this.app.vault.getConfig("readableLineLength") !== false;

    const containerEl = view.containerEl;
    const contentEl = view.contentEl;
    if (!containerEl || !contentEl) return;

    containerEl.classList.toggle("pprw-full-width-page", fullWidth);
    contentEl.classList.toggle("pprw-full-width-page", fullWidth);

    const sourceViewEl = contentEl.querySelector(".markdown-source-view");
    const previewViewEl = contentEl.querySelector(".markdown-preview-view");

    if (fullWidth) {
      sourceViewEl?.classList.remove("is-readable-line-width");
      previewViewEl?.classList.remove("is-readable-line-width");
    } else if (globalReadable) {
      sourceViewEl?.classList.add("is-readable-line-width");
      previewViewEl?.classList.add("is-readable-line-width");
    }

    this.ensureHeaderButton(view, fullWidth);
  }

  ensureHeaderButton(view, fullWidth) {
    const actionsEl = view.containerEl?.querySelector(".view-actions");
    if (!actionsEl) return;

    let btn = actionsEl.querySelector(".pprw-header-btn");
    if (!this.settings.showHeaderButton) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement("a");
      btn.className = "clickable-icon view-action pprw-header-btn";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (view.file) {
          this.togglePageFullWidth(view.file);
        }
      });
      actionsEl.prepend(btn);
    }

    btn.classList.toggle("pprw-active-btn", fullWidth);
    btn.setAttribute(
      "aria-label",
      fullWidth
        ? "Full width active (click to restore readable line length)"
        : "Readable line length active (click to make page full width)"
    );
    obsidian.setIcon(btn, fullWidth ? "minimize-2" : "maximize-2");
  }

  refreshAllLeaves() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof obsidian.MarkdownView) {
        this.applyWidthToMarkdownView(leaf.view);
      }
    });
  }

  async onload() {
    await this.loadSettings();

    this.app.workspace.onLayoutReady(() => {
      this.refreshAllLeaves();
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshAllLeaves();
      })
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.refreshAllLeaves();
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.refreshAllLeaves();
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.refreshAllLeaves();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        const normOld = obsidian.normalizePath(oldPath);
        const idx = this.settings.fullWidthPages.indexOf(normOld);
        if (idx >= 0) {
          this.settings.fullWidthPages[idx] = obsidian.normalizePath(file.path);
          await this.saveSettings();
          this.refreshAllLeaves();
        }
      })
    );

    // Command Palette: Toggle Full Width for Current Page
    this.addCommand({
      id: "toggle-page-readable-line-length",
      name: "Toggle readable line length (Full Width) for current page",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) {
          this.togglePageFullWidth(file);
        }
        return true;
      }
    });

    // File Context Menu (Right-click note or 3-dots menu)
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof obsidian.TFile) || file.extension !== "md") return;
        const isFull = this.isFileFullWidth(file);
        menu.addItem((item) => {
          item
            .setTitle(
              isFull
                ? "Enable readable line length for this page"
                : "Disable readable line length (Full width) for this page"
            )
            .setIcon(isFull ? "minimize-2" : "maximize-2")
            .onClick(() => {
              this.togglePageFullWidth(file);
            });
        });
      })
    );

    this.addSettingTab(new PerPageReadableWidthSettingTab(this.app, this));
  }

  onunload() {
    const globalReadable = this.app.vault.getConfig("readableLineLength") !== false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof obsidian.MarkdownView) {
        const { containerEl, contentEl } = leaf.view;
        containerEl?.classList.remove("pprw-full-width-page");
        contentEl?.classList.remove("pprw-full-width-page");
        containerEl?.querySelector(".pprw-header-btn")?.remove();
        if (globalReadable) {
          contentEl?.querySelector(".markdown-source-view")?.classList.add("is-readable-line-width");
          contentEl?.querySelector(".markdown-preview-view")?.classList.add("is-readable-line-width");
        }
      }
    });
  }
}

module.exports = PerPageReadableWidthPlugin;

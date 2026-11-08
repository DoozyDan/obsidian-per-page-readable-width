import {
  App,
  MarkdownView,
  Notice,
  normalizePath,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  setIcon
} from "obsidian";

interface PerPageReadableWidthSettings {
  fullWidthPages: string[];
  fullWidthFolders: string[];
  respectFrontmatter: boolean;
  showHeaderButton: boolean;
}

interface VaultWithConfig {
  getConfig?: (key: string) => unknown;
}

const DEFAULT_SETTINGS: PerPageReadableWidthSettings = {
  fullWidthPages: ["Notes/Budget.md"],
  fullWidthFolders: [],
  respectFrontmatter: true,
  showHeaderButton: true
};

class PerPageReadableWidthSettingTab extends PluginSettingTab {
  plugin: PerPageReadableWidthPlugin;

  constructor(app: App, plugin: PerPageReadableWidthPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("General")
      .setHeading();

    new Setting(containerEl)
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

    new Setting(containerEl)
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

    new Setting(containerEl)
      .setName("Full-Width Pages (Readable Line Length Off)")
      .setHeading();

    let newPagePath = "";
    new Setting(containerEl)
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
            const normalized = normalizePath(newPagePath);
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
        new Setting(pagesList)
          .setName(pagePath)
          .addButton((btn) =>
            btn
              .setButtonText("Remove")
              .setClass("mod-warning")
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

    new Setting(containerEl)
      .setName("Full-Width Folders")
      .setHeading();

    let newFolderPath = "";
    new Setting(containerEl)
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
            const normalized = normalizePath(newFolderPath).replace(/\/+$/, "");
            if (!this.plugin.settings.fullWidthFolders.includes(normalized)) {
              this.plugin.settings.fullWidthFolders.push(normalized);
              await this.plugin.saveSettings();
              this.plugin.refreshAllLeaves();
              this.display();
            }
          });
      });

    const foldersList = containerEl.createDiv();
    if (this.plugin.settings.fullWidthFolders.length === 0) {
      foldersList.createEl("p", {
        text: "No full-width folders configured yet.",
        cls: "setting-item-description"
      });
    } else {
      for (const folderPath of this.plugin.settings.fullWidthFolders) {
        new Setting(foldersList)
          .setName(folderPath)
          .addButton((btn) =>
            btn
              .setButtonText("Remove")
              .setClass("mod-warning")
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
}

export default class PerPageReadableWidthPlugin extends Plugin {
  settings: PerPageReadableWidthSettings;

  async loadSettings(): Promise<void> {
    const loadedData = (await this.loadData()) as unknown;
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      loadedData as Partial<PerPageReadableWidthSettings>
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  isFileFullWidth(file: TFile | null): boolean {
    if (!file) return false;
    const path = normalizePath(file.path);

    if (this.settings.fullWidthPages.includes(path)) {
      return true;
    }

    for (const folder of this.settings.fullWidthFolders) {
      const normFolder = normalizePath(folder);
      if (path.startsWith(normFolder + "/")) {
        return true;
      }
    }

    if (this.settings.respectFrontmatter) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (fm) {
        if (
          fm["wide"] === true ||
          fm["full-width"] === true ||
          fm["fullwidth"] === true ||
          fm["readable-line-length"] === false ||
          fm["readableLineLength"] === false
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async togglePageFullWidth(file: TFile): Promise<void> {
    if (!file) return;
    const path = normalizePath(file.path);
    const isFull = this.isFileFullWidth(file);

    if (isFull) {
      this.settings.fullWidthPages = this.settings.fullWidthPages.filter((p) => p !== path);
      new Notice(`Per-Page Width: Readable line length restored for ${file.basename}`);
    } else {
      if (!this.settings.fullWidthPages.includes(path)) {
        this.settings.fullWidthPages.push(path);
      }
      new Notice(`Per-Page Width: Full width enabled for ${file.basename}`);
    }

    await this.saveSettings();
    this.refreshAllLeaves();
  }

  applyWidthToMarkdownView(view: MarkdownView): void {
    if (!view || !view.file) return;

    const fullWidth = this.isFileFullWidth(view.file);
    const vaultConfig = this.app.vault as unknown as VaultWithConfig;
    const globalReadable =
      typeof vaultConfig.getConfig === "function"
        ? vaultConfig.getConfig("readableLineLength") !== false
        : true;

    const { containerEl, contentEl } = view;
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

  ensureHeaderButton(view: MarkdownView, fullWidth: boolean): void {
    const actionsEl = view.containerEl?.querySelector(".view-actions");
    if (!actionsEl) return;

    let btn = actionsEl.querySelector<HTMLAnchorElement>(".pprw-header-btn");
    if (!this.settings.showHeaderButton) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = createEl("a", { cls: "clickable-icon view-action pprw-header-btn" });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (view.file) {
          void this.togglePageFullWidth(view.file);
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
    setIcon(btn, fullWidth ? "minimize-2" : "maximize-2");
  }

  refreshAllLeaves(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        this.applyWidthToMarkdownView(leaf.view);
      }
    });
  }

  async onload(): Promise<void> {
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
      this.app.metadataCache.on("changed", () => {
        this.refreshAllLeaves();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        const normOld = normalizePath(oldPath);
        const idx = this.settings.fullWidthPages.indexOf(normOld);
        if (idx >= 0) {
          this.settings.fullWidthPages[idx] = normalizePath(file.path);
          await this.saveSettings();
          this.refreshAllLeaves();
        }
      })
    );

    // Command Palette: Toggle Full Width for Current Page
    this.addCommand({
      id: "toggle-page-readable-line-length",
      name: "Toggle readable line length (Full Width) for current page",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) {
          void this.togglePageFullWidth(file);
        }
        return true;
      }
    });

    // File Context Menu (Right-click note or 3-dots menu)
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") return;
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
              void this.togglePageFullWidth(file);
            });
        });
      })
    );

    this.addSettingTab(new PerPageReadableWidthSettingTab(this.app, this));
  }

  onunload(): void {
    const vaultConfig = this.app.vault as unknown as VaultWithConfig;
    const globalReadable =
      typeof vaultConfig.getConfig === "function"
        ? vaultConfig.getConfig("readableLineLength") !== false
        : true;

    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
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

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Brand tokens structure for test data
 */
export interface BrandTokens {
  colors?: {
    primary: string;
    secondary: string;
    accent?: string;
    neutralDark: string;
    neutralLight: string;
  };
  typography?: {
    primaryFont: string;
    styleDescriptor: string;
  };
  visualStyle?: {
    aesthetic: string;
    photographyStyle: string;
    mood: string;
  };
  voice?: {
    tone: string[];
    forbiddenTerms: string[];
  };
}

/**
 * Page object for Brand Editor page
 * Handles brand profile creation and token management
 */
export class BrandEditorPage extends BasePage {
  async goto(id?: string): Promise<void> {
    const path = id ? `/brands/${id}` : '/brands';
    await super.goto(path);
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="brand-editor"], [data-testid="brand-library"]')).toBeVisible();
  }

  /**
   * Create a new brand with name and tokens
   */
  async createBrand(name: string, tokens?: BrandTokens): Promise<void> {
    await this.clickByTestId('new-brand');
    await this.fillByTestId('brand-name', name);
    
    if (tokens) {
      // Set color tokens
      if (tokens.colors) {
        await this.setColorToken('primary', tokens.colors.primary);
        await this.setColorToken('secondary', tokens.colors.secondary);
        if (tokens.colors.accent) {
          await this.setColorToken('accent', tokens.colors.accent);
        }
      }
      
      // Set visual style
      if (tokens.visualStyle) {
        await this.setVisualStyle(tokens.visualStyle.aesthetic, tokens.visualStyle.photographyStyle);
      }
      
      // Set voice
      if (tokens.voice) {
        await this.setVoice(tokens.voice.tone, tokens.voice.forbiddenTerms);
      }
    }
  }

  /**
   * Set a color token value
   */
  async setColorToken(key: string, value: string): Promise<void> {
    const colorInput = this.page.locator(`[data-testid="color-${key}"], [data-testid="brand-color-${key}"]`);
    await colorInput.fill(value);
  }

  /**
   * Set visual style tokens
   */
  async setVisualStyle(aesthetic: string, photography: string): Promise<void> {
    await this.fillByTestId('aesthetic-style', aesthetic);
    await this.fillByTestId('photography-style', photography);
  }

  /**
   * Set voice/tone tokens
   */
  async setVoice(tone: string[], forbiddenTerms: string[]): Promise<void> {
    // Add tone descriptors
    for (const t of tone) {
      const toneInput = this.page.locator('[data-testid="tone-input"], [data-testid="brand-tone"]');
      await toneInput.fill(t);
      await toneInput.press('Enter');
    }
    
    // Add forbidden terms
    for (const term of forbiddenTerms) {
      const forbiddenInput = this.page.locator('[data-testid="forbidden-input"], [data-testid="forbidden-terms"]');
      await forbiddenInput.fill(term);
      await forbiddenInput.press('Enter');
    }
  }

  /**
   * Set the current brand as default
   */
  async setDefaultBrand(): Promise<void> {
    await this.clickByTestId('set-default-brand');
  }

  /**
   * Preview token injection with a template
   */
  async previewTokenInjection(templateId: string): Promise<void> {
    await this.clickByTestId('preview-tokens');
    await this.selectOptionByTestId('preview-template', templateId);
    await this.clickByTestId('run-preview');
  }

  /**
   * Save the brand profile
   */
  async saveBrand(): Promise<void> {
    await this.clickByTestId('save-brand');
    await this.waitForNetworkIdle();
  }

  /**
   * Expect brand to be saved successfully
   */
  async expectBrandSaved(): Promise<void> {
    await this.expectToast('saved');
  }

  /**
   * Select a brand from the library
   */
  async selectBrand(brandId: string): Promise<void> {
    await this.page.click(`[data-testid="brand-${brandId}"]`);
  }

  /**
   * Delete a brand
   */
  async deleteBrand(brandId: string): Promise<void> {
    await this.page.click(`[data-testid="brand-${brandId}-delete"]`);
    
    if (await this.elementExists('confirm-delete')) {
      await this.clickByTestId('confirm-delete');
    }
  }

  /**
   * Duplicate a brand
   */
  async duplicateBrand(brandId: string, newName?: string): Promise<void> {
    await this.page.click(`[data-testid="brand-${brandId}-duplicate"]`);
    
    if (newName && await this.elementExists('duplicate-name')) {
      await this.fillByTestId('duplicate-name', newName);
      await this.clickByTestId('confirm-duplicate');
    }
  }

  /**
   * Get the preview output text
   */
  async getPreviewOutput(): Promise<string> {
    const preview = this.page.locator('[data-testid="token-preview-output"], [data-testid="preview-result"]');
    return await preview.textContent() || '';
  }

  /**
   * Expect preview to show injected tokens
   */
  async expectPreviewContains(text: string): Promise<void> {
    const preview = this.page.locator('[data-testid="token-preview-output"], [data-testid="preview-result"]');
    await expect(preview).toContainText(text);
  }
}

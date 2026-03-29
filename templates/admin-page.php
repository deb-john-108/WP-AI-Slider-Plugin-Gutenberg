<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$or_key    = WP_AI_Slider_Settings::get_openrouter_key();
$px_key    = WP_AI_Slider_Settings::get_pixabay_key();
$ai_model  = WP_AI_Slider_Settings::get_ai_model();
$or_set    = ! empty( $or_key );
$px_set    = ! empty( $px_key );
?>
<div class="wrap wpais-admin-page">

	<!-- ── Header ───────────────────────────────────────────── -->
	<div class="wpais-header">
		<div class="wpais-header-inner">
			<div class="wpais-logo">
				<span class="dashicons dashicons-images-alt2"></span>
				<div>
					<h1>WP AI Slider Plugin</h1>
					<p>Powered by Pixabay &amp; OpenRouter AI</p>
				</div>
			</div>
			<div class="wpais-version">v<?php echo esc_html( WP_AI_SLIDER_VERSION ); ?></div>
		</div>
	</div>

	<!-- ── Main layout ──────────────────────────────────────── -->
	<div class="wpais-layout">

		<!-- LEFT COLUMN: Settings form -->
		<div class="wpais-main">

			<div class="wpais-card" id="card-openrouter">
				<div class="wpais-card-header">
					<span class="dashicons dashicons-admin-network"></span>
					<h2>OpenRouter API <em>(AI Text Generation)</em></h2>
					<span class="wpais-badge <?php echo $or_set ? 'badge-ok' : 'badge-warn'; ?>">
						<?php echo $or_set ? '✓ Configured' : '⚠ Not Set'; ?>
					</span>
				</div>
				<div class="wpais-card-body">
					<p class="wpais-help">
						Get a free API key at
						<a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>.
						OpenRouter gives you access to GPT-4o, Claude, Gemini, Llama, and hundreds of other models.
					</p>

					<div class="wpais-field">
						<label for="openrouter_api_key">API Key</label>
						<div class="wpais-input-row">
							<input type="password" id="openrouter_api_key" class="regular-text wpais-key-input"
								   placeholder="sk-or-v1-…" autocomplete="new-password" />
							<button type="button" class="button wpais-toggle-vis" data-target="openrouter_api_key"
									title="Show / hide key">
								<span class="dashicons dashicons-visibility"></span>
							</button>
						</div>
					</div>

					<div class="wpais-field">
						<label for="ai_model">AI Model</label>
						<div class="wpais-input-row">
							<select id="ai_model" class="regular-text">
								<option value="openai/gpt-4o-mini"                        <?php selected($ai_model,'openai/gpt-4o-mini'); ?>>GPT-4o Mini (OpenAI) — Fast &amp; Free tier</option>
								<option value="openai/gpt-3.5-turbo"                      <?php selected($ai_model,'openai/gpt-3.5-turbo'); ?>>GPT-3.5 Turbo (OpenAI)</option>
								<option value="openai/gpt-4o"                             <?php selected($ai_model,'openai/gpt-4o'); ?>>GPT-4o (OpenAI)</option>
								<option value="anthropic/claude-3-haiku"                  <?php selected($ai_model,'anthropic/claude-3-haiku'); ?>>Claude 3 Haiku (Anthropic) — Fast</option>
								<option value="anthropic/claude-3-sonnet"                 <?php selected($ai_model,'anthropic/claude-3-sonnet'); ?>>Claude 3 Sonnet (Anthropic)</option>
								<option value="google/gemini-flash-1.5"                   <?php selected($ai_model,'google/gemini-flash-1.5'); ?>>Gemini 1.5 Flash (Google)</option>
								<option value="google/gemini-pro"                         <?php selected($ai_model,'google/gemini-pro'); ?>>Gemini Pro (Google)</option>
								<option value="meta-llama/llama-3-8b-instruct:free"       <?php selected($ai_model,'meta-llama/llama-3-8b-instruct:free'); ?>>Llama 3 8B (Free)</option>
								<option value="mistralai/mistral-7b-instruct:free"        <?php selected($ai_model,'mistralai/mistral-7b-instruct:free'); ?>>Mistral 7B (Free)</option>
							</select>
							<button type="button" id="btn-fetch-models" class="button" title="Load all available models from your account">
								<span class="dashicons dashicons-update"></span> Refresh
							</button>
						</div>
						<p class="description">Click Refresh to load all models available on your OpenRouter account.</p>
					</div>

					<div class="wpais-test-row">
						<button type="button" id="btn-test-openrouter" class="button button-secondary">
							<span class="dashicons dashicons-yes-alt"></span>
							Test OpenRouter Connection
						</button>
						<span id="result-openrouter" class="wpais-test-result"></span>
					</div>
				</div>
			</div><!-- /card-openrouter -->

			<div class="wpais-card" id="card-pixabay">
				<div class="wpais-card-header">
					<span class="dashicons dashicons-format-image"></span>
					<h2>Pixabay API <em>(Image Search)</em></h2>
					<span class="wpais-badge <?php echo $px_set ? 'badge-ok' : 'badge-warn'; ?>">
						<?php echo $px_set ? '✓ Configured' : '⚠ Not Set'; ?>
					</span>
				</div>
				<div class="wpais-card-body">
					<p class="wpais-help">
						Register for a free API key at
						<a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener">pixabay.com/api/docs</a>.
						The free tier allows up to 500 requests / hour with high-resolution images.
					</p>

					<div class="wpais-field">
						<label for="pixabay_api_key">API Key</label>
						<div class="wpais-input-row">
							<input type="password" id="pixabay_api_key" class="regular-text wpais-key-input"
								   placeholder="12345678-abcdef1234567890abcdef12" autocomplete="new-password" />
							<button type="button" class="button wpais-toggle-vis" data-target="pixabay_api_key"
									title="Show / hide key">
								<span class="dashicons dashicons-visibility"></span>
							</button>
						</div>
					</div>

					<div class="wpais-test-row">
						<button type="button" id="btn-test-pixabay" class="button button-secondary">
							<span class="dashicons dashicons-yes-alt"></span>
							Test Pixabay Connection
						</button>
						<span id="result-pixabay" class="wpais-test-result"></span>
					</div>
				</div>
			</div><!-- /card-pixabay -->

			<div class="wpais-save-bar">
				<button type="button" id="btn-save-settings" class="button button-primary button-large">
					<span class="dashicons dashicons-saved"></span>
					Save Settings
				</button>
				<span id="result-save" class="wpais-test-result"></span>
			</div>

		</div><!-- /wpais-main -->

		<!-- RIGHT COLUMN: Status + Guide -->
		<div class="wpais-sidebar">

			<!-- Status card -->
			<div class="wpais-card wpais-status-card">
				<div class="wpais-card-header">
					<span class="dashicons dashicons-dashboard"></span>
					<h2>Plugin Status</h2>
				</div>
				<div class="wpais-card-body">
					<table class="wpais-status-table">
						<tr>
							<td>Plugin Version</td>
							<td><span class="wpais-tag"><?php echo esc_html( WP_AI_SLIDER_VERSION ); ?></span></td>
						</tr>
						<tr>
							<td>WordPress</td>
							<td><span class="wpais-tag"><?php echo esc_html( get_bloginfo('version') ); ?></span></td>
						</tr>
						<tr>
							<td>PHP</td>
							<td><span class="wpais-tag"><?php echo esc_html( PHP_VERSION ); ?></span></td>
						</tr>
						<tr>
							<td>OpenRouter API</td>
							<td>
								<span class="wpais-badge <?php echo $or_set ? 'badge-ok' : 'badge-warn'; ?>" style="font-size:11px;padding:2px 8px;">
									<?php echo $or_set ? '✓ Set' : '⚠ Missing'; ?>
								</span>
							</td>
						</tr>
						<tr>
							<td>Pixabay API</td>
							<td>
								<span class="wpais-badge <?php echo $px_set ? 'badge-ok' : 'badge-warn'; ?>" style="font-size:11px;padding:2px 8px;">
									<?php echo $px_set ? '✓ Set' : '⚠ Missing'; ?>
								</span>
							</td>
						</tr>
						<tr>
							<td>Active Model</td>
							<td><span class="wpais-tag" style="font-size:10px;word-break:break-all;"><?php echo esc_html( $ai_model ); ?></span></td>
						</tr>
					</table>
				</div>
			</div><!-- /status card -->

			<!-- How-to card -->
			<div class="wpais-card wpais-howto-card">
				<div class="wpais-card-header">
					<span class="dashicons dashicons-info-outline"></span>
					<h2>Quick Start Guide</h2>
				</div>
				<div class="wpais-card-body">
					<ol class="wpais-steps">
						<li>
							<strong>Enter API Keys</strong><br>
							Add your OpenRouter and Pixabay API keys in the fields on the left.
						</li>
						<li>
							<strong>Test Connections</strong><br>
							Click the <em>Test</em> buttons to confirm both APIs are responding correctly.
						</li>
						<li>
							<strong>Choose a Model</strong><br>
							Select the AI model you'd like to use, or click Refresh to see all options.
						</li>
						<li>
							<strong>Save Settings</strong><br>
							Click <em>Save Settings</em> — you only need to do this once.
						</li>
						<li>
							<strong>Edit a Post/Page</strong><br>
							Open any post or page in the Gutenberg editor.
						</li>
						<li>
							<strong>Add the Block</strong><br>
							Click <strong>+</strong> and search for <em>"WP AI Slider"</em> to insert the block.
						</li>
						<li>
							<strong>Build Your Slider</strong><br>
							Search for Pixabay images and use <strong>Tab 1</strong> (AI from image) or
							<strong>Tab 2</strong> (manual prompt) to generate hero text.
						</li>
					</ol>
				</div>
			</div><!-- /howto card -->

		</div><!-- /wpais-sidebar -->

	</div><!-- /wpais-layout -->

</div><!-- /wrap -->

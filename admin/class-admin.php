<?php
/**
 * Admin panel for WP AI Slider Plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WP_AI_Slider_Admin {

	public function __construct() {
		add_action( 'admin_menu',            [ $this, 'register_menu' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_filter( 'plugin_action_links_' . WP_AI_SLIDER_BASENAME, [ $this, 'plugin_action_links' ] );
	}

	public function register_menu() {
		add_menu_page(
			__( 'WP AI Slider', 'wp-ai-slider' ),
			__( 'WP AI Slider', 'wp-ai-slider' ),
			'manage_options',
			'wp-ai-slider',
			[ $this, 'render_page' ],
			'dashicons-images-alt2',
			82
		);

		add_submenu_page(
			'wp-ai-slider',
			__( 'Settings', 'wp-ai-slider' ),
			__( 'Settings', 'wp-ai-slider' ),
			'manage_options',
			'wp-ai-slider',
			[ $this, 'render_page' ]
		);
	}

	public function enqueue_assets( $hook ) {
		if ( $hook !== 'toplevel_page_wp-ai-slider' ) {
			return;
		}

		wp_enqueue_script(
			'wp-ai-slider-admin',
			WP_AI_SLIDER_URL . 'assets/js/admin.js',
			[ 'jquery' ],
			WP_AI_SLIDER_VERSION,
			true
		);

		wp_localize_script( 'wp-ai-slider-admin', 'wpAiSliderAdmin', [
			'restUrl' => rest_url( 'wp-ai-slider/v1' ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
			'i18n'    => [
				'saving'        => __( 'Saving...', 'wp-ai-slider' ),
				'testing'       => __( 'Testing...', 'wp-ai-slider' ),
				'loadingModels' => __( 'Loading models...', 'wp-ai-slider' ),
				'saveSuccess'   => __( 'Settings saved!', 'wp-ai-slider' ),
			],
		] );

		wp_enqueue_style(
			'wp-ai-slider-admin',
			WP_AI_SLIDER_URL . 'assets/css/admin.css',
			[ 'dashicons' ],
			WP_AI_SLIDER_VERSION
		);
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'You do not have permission to access this page.', 'wp-ai-slider' ) );
		}
		include WP_AI_SLIDER_DIR . 'templates/admin-page.php';
	}

	public function plugin_action_links( $links ) {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			admin_url( 'admin.php?page=wp-ai-slider' ),
			__( 'Settings', 'wp-ai-slider' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}
}

<?php
/**
 * Registers all WP REST API routes for WP AI Slider Plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WP_AI_Slider_REST_API {

	private $namespace = 'wp-ai-slider/v1';
	private $handler;

	public function __construct() {
		$this->handler = new WP_AI_Slider_API_Handler();
	}

	public function register_routes() {

		// ── Image Search ──────────────────────────────────────────
		register_rest_route( $this->namespace, '/search-pixabay', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'search_pixabay' ],
			'permission_callback' => [ $this, 'can_edit' ],
			'args'                => [
				'query' => [
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => fn( $v ) => ! empty( trim( $v ) ),
				],
				'page'  => [
					'required'          => false,
					'default'           => 1,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'per_page' => [
					'required'          => false,
					'default'           => 20,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
			],
		] );

		// ── Text Generation ───────────────────────────────────────
		register_rest_route( $this->namespace, '/generate-text', [
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'generate_text' ],
			'permission_callback' => [ $this, 'can_edit' ],
		] );

		// ── Test APIs ─────────────────────────────────────────────
		register_rest_route( $this->namespace, '/test-pixabay', [
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'test_pixabay' ],
			'permission_callback' => [ $this, 'can_manage' ],
		] );

		register_rest_route( $this->namespace, '/test-openrouter', [
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'test_openrouter' ],
			'permission_callback' => [ $this, 'can_manage' ],
		] );

		// ── Model List ────────────────────────────────────────────
		register_rest_route( $this->namespace, '/get-models', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'get_models' ],
			'permission_callback' => [ $this, 'can_manage' ],
		] );

		// ── Settings ──────────────────────────────────────────────
		register_rest_route( $this->namespace, '/save-settings', [
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'save_settings' ],
			'permission_callback' => [ $this, 'can_manage' ],
		] );

		register_rest_route( $this->namespace, '/get-settings', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'get_settings' ],
			'permission_callback' => [ $this, 'can_manage' ],
		] );
	}

	/* ── Permission helpers ──────────────────────────────────── */

	public function can_edit() {
		return current_user_can( 'edit_posts' );
	}

	public function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/* ── Callbacks ───────────────────────────────────────────── */

	public function search_pixabay( WP_REST_Request $request ) {
		$query    = $request->get_param( 'query' );
		$page     = $request->get_param( 'page' );
		$per_page = $request->get_param( 'per_page' );

		$result = $this->handler->search_pixabay( $query, $per_page, $page );
		if ( is_wp_error( $result ) ) {
			return $this->error( $result );
		}

		return rest_ensure_response( $result );
	}

	public function generate_text( WP_REST_Request $request ) {
		$body   = $request->get_json_params();
		$prompt = sanitize_textarea_field( $body['prompt'] ?? '' );
		$system = sanitize_textarea_field( $body['system'] ?? '' );

		if ( empty( $prompt ) ) {
			return $this->error_msg( 'Prompt is required.', 400 );
		}
		if ( strlen( $prompt ) > 2000 ) {
			return $this->error_msg( 'Prompt is too long (max 2000 characters).', 400 );
		}

		$result = $this->handler->generate_text( $prompt, $system );
		if ( is_wp_error( $result ) ) {
			return $this->error( $result );
		}

		return rest_ensure_response( $result );
	}

	public function test_pixabay( WP_REST_Request $request ) {
		$result = $this->handler->test_pixabay();
		if ( is_wp_error( $result ) ) {
			return $this->error( $result );
		}
		return rest_ensure_response( $result );
	}

	public function test_openrouter( WP_REST_Request $request ) {
		$result = $this->handler->test_openrouter();
		if ( is_wp_error( $result ) ) {
			return $this->error( $result );
		}
		return rest_ensure_response( $result );
	}

	public function get_models( WP_REST_Request $request ) {
		$result = $this->handler->get_openrouter_models();
		if ( is_wp_error( $result ) ) {
			return $this->error( $result );
		}
		return rest_ensure_response( $result );
	}

	public function save_settings( WP_REST_Request $request ) {
		$body     = $request->get_json_params();
		$settings = [];

		if ( isset( $body['openrouter_api_key'] ) ) {
			$settings['openrouter_api_key'] = sanitize_text_field( $body['openrouter_api_key'] );
		}
		if ( isset( $body['pixabay_api_key'] ) ) {
			$settings['pixabay_api_key'] = sanitize_text_field( $body['pixabay_api_key'] );
		}
		if ( isset( $body['ai_model'] ) ) {
			$settings['ai_model'] = sanitize_text_field( $body['ai_model'] );
		}

		WP_AI_Slider_Settings::update( $settings );

		return rest_ensure_response( [
			'success' => true,
			'message' => __( 'Settings saved successfully!', 'wp-ai-slider' ),
		] );
	}

	public function get_settings( WP_REST_Request $request ) {
		$settings = WP_AI_Slider_Settings::get();
		return rest_ensure_response( [
			'success'  => true,
			'settings' => [
				'openrouter_api_key' => $settings['openrouter_api_key'] ?? '',
				'pixabay_api_key'    => $settings['pixabay_api_key']    ?? '',
				'ai_model'           => $settings['ai_model']           ?? 'openai/gpt-3.5-turbo',
			],
		] );
	}

	/* ── Error helpers ───────────────────────────────────────── */

	private function error( WP_Error $e, $status = 400 ) {
		return new WP_REST_Response( [
			'success' => false,
			'message' => $e->get_error_message(),
			'code'    => $e->get_error_code(),
		], $status );
	}

	private function error_msg( $msg, $status = 400 ) {
		return new WP_REST_Response( [ 'success' => false, 'message' => $msg ], $status );
	}
}

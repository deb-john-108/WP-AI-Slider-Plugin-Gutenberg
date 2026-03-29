<?php
/**
 * Handles all external API calls: Pixabay (images) and OpenRouter (AI text).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WP_AI_Slider_API_Handler {

	/* ---------------------------------------------------------------
	 * PIXABAY
	 * ------------------------------------------------------------- */

	/**
	 * Search Pixabay for images.
	 *
	 * @param string $query
	 * @param int    $per_page
	 * @param int    $page
	 * @return array|WP_Error
	 */
	public function search_pixabay( $query, $per_page = 20, $page = 1 ) {
		$api_key = WP_AI_Slider_Settings::get_pixabay_key();
		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_key', __( 'Pixabay API key is not configured. Please add it in WP AI Slider settings.', 'wp-ai-slider' ) );
		}

		$url = add_query_arg( [
			'key'        => $api_key,
			'q'          => urlencode( sanitize_text_field( $query ) ),
			'image_type' => 'photo',
			'per_page'   => min( $per_page, 200 ),
			'page'       => max( $page, 1 ),
			'safesearch' => 'true',
			'lang'       => 'en',
			'orientation'=> 'horizontal',
		], 'https://pixabay.com/api/' );

		$response = wp_remote_get( $url, [ 'timeout' => 15 ] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code === 429 ) {
			return new WP_Error( 'rate_limit', __( 'Pixabay API rate limit reached. Please try again later.', 'wp-ai-slider' ) );
		}

		if ( $code !== 200 ) {
			$msg = $body['message'] ?? "Pixabay API returned status $code";
			return new WP_Error( 'pixabay_error', $msg );
		}

		return $body;
	}

	/**
	 * Test Pixabay connectivity.
	 */
	public function test_pixabay() {
		$result = $this->search_pixabay( 'landscape', 3, 1 );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return [
			'success' => true,
			'message' => sprintf( __( 'Pixabay connected! Found %s total images.', 'wp-ai-slider' ), number_format( $result['totalHits'] ?? 0 ) ),
		];
	}

	/* ---------------------------------------------------------------
	 * OPENROUTER
	 * ------------------------------------------------------------- */

	/**
	 * Generate text via OpenRouter API.
	 *
	 * @param string $prompt
	 * @param string $system_prompt
	 * @return array|WP_Error
	 */
	public function generate_text( $prompt, $system_prompt = '' ) {
		$api_key = WP_AI_Slider_Settings::get_openrouter_key();
		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_key', __( 'OpenRouter API key is not configured. Please add it in WP AI Slider settings.', 'wp-ai-slider' ) );
		}

		$model    = WP_AI_Slider_Settings::get_ai_model();
		$messages = [];

		if ( ! empty( $system_prompt ) ) {
			$messages[] = [ 'role' => 'system', 'content' => $system_prompt ];
		}
		$messages[] = [ 'role' => 'user', 'content' => $prompt ];

		$response = wp_remote_post( 'https://openrouter.ai/api/v1/chat/completions', [
			'timeout' => 30,
			'headers' => [
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
				'HTTP-Referer'  => get_site_url(),
				'X-Title'       => get_bloginfo( 'name' ),
			],
			'body' => wp_json_encode( [
				'model'      => $model,
				'messages'   => $messages,
				'max_tokens' => 200,
				'temperature' => 0.8,
			] ),
		] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code === 401 ) {
			return new WP_Error( 'auth_error', __( 'Invalid OpenRouter API key. Please check your key in settings.', 'wp-ai-slider' ) );
		}

		if ( $code === 402 ) {
			return new WP_Error( 'credit_error', __( 'Insufficient OpenRouter credits. Please top up your account.', 'wp-ai-slider' ) );
		}

		if ( $code !== 200 ) {
			$msg = $body['error']['message'] ?? "OpenRouter API returned status $code";
			return new WP_Error( 'openrouter_error', $msg );
		}

		$text = trim( $body['choices'][0]['message']['content'] ?? '' );
		if ( empty( $text ) ) {
			return new WP_Error( 'empty_response', __( 'AI returned an empty response. Please try again.', 'wp-ai-slider' ) );
		}

		return [
			'success' => true,
			'text'    => $text,
			'model'   => $body['model'] ?? $model,
			'usage'   => $body['usage'] ?? [],
		];
	}

	/**
	 * Test OpenRouter connectivity.
	 */
	public function test_openrouter() {
		$result = $this->generate_text(
			'Reply with exactly: "API Connected!"',
			'You are a test assistant. Follow instructions precisely.'
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return [
			'success'  => true,
			'message'  => __( 'OpenRouter API connected successfully!', 'wp-ai-slider' ),
			'response' => $result['text'],
			'model'    => $result['model'],
		];
	}

	/**
	 * Fetch available models from OpenRouter.
	 */
	public function get_openrouter_models() {
		$api_key = WP_AI_Slider_Settings::get_openrouter_key();
		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_key', __( 'OpenRouter API key is not configured.', 'wp-ai-slider' ) );
		}

		$response = wp_remote_get( 'https://openrouter.ai/api/v1/models', [
			'timeout' => 15,
			'headers' => [
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			],
		] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code !== 200 ) {
			return new WP_Error( 'openrouter_error', __( 'Could not fetch model list from OpenRouter.', 'wp-ai-slider' ) );
		}

		$models = [];
		foreach ( ( $body['data'] ?? [] ) as $model ) {
			$models[] = [
				'id'          => $model['id']   ?? '',
				'name'        => $model['name'] ?? $model['id'] ?? '',
				'context'     => $model['context_length'] ?? 0,
				'description' => $model['description'] ?? '',
			];
		}

		// Sort by name
		usort( $models, fn( $a, $b ) => strcmp( $a['name'], $b['name'] ) );

		return [ 'success' => true, 'models' => $models ];
	}
}

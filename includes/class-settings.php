<?php
/**
 * Settings management for WP AI Slider Plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WP_AI_Slider_Settings {

	private static $option_key = 'wp_ai_slider_settings';

	/**
	 * Get all settings or a single key.
	 */
	public static function get( $key = null ) {
		$settings = get_option( self::$option_key, [] );
		if ( $key !== null ) {
			return $settings[ $key ] ?? '';
		}
		return $settings;
	}

	/**
	 * Merge & save settings.
	 */
	public static function update( array $data ) {
		$current = self::get();
		$updated = array_merge( $current, $data );
		return update_option( self::$option_key, $updated );
	}

	public static function get_openrouter_key() {
		return self::get( 'openrouter_api_key' );
	}

	public static function get_pixabay_key() {
		return self::get( 'pixabay_api_key' );
	}

	public static function get_ai_model() {
		return self::get( 'ai_model' ) ?: 'openai/gpt-3.5-turbo';
	}
}

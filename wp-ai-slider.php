<?php
/**
 * Plugin Name: WP AI Slider Plugin
 * Plugin URI:  https://example.com/wp-ai-slider
 * Description: Create AI-powered image sliders in the Gutenberg editor using Pixabay images and OpenRouter AI-generated hero text.
 * Version:     1.1.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author:      WP AI Slider
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-ai-slider
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WP_AI_SLIDER_VERSION',  '1.1.0' );
define( 'WP_AI_SLIDER_DIR',      plugin_dir_path( __FILE__ ) );
define( 'WP_AI_SLIDER_URL',      plugin_dir_url( __FILE__ ) );
define( 'WP_AI_SLIDER_BASENAME', plugin_basename( __FILE__ ) );

/* ---------------------------------------------------------------
 * Load core classes
 * ------------------------------------------------------------- */
require_once WP_AI_SLIDER_DIR . 'includes/class-settings.php';
require_once WP_AI_SLIDER_DIR . 'includes/class-api-handler.php';
require_once WP_AI_SLIDER_DIR . 'includes/class-rest-api.php';

if ( is_admin() ) {
	require_once WP_AI_SLIDER_DIR . 'admin/class-admin.php';
	new WP_AI_Slider_Admin();
}

/* ---------------------------------------------------------------
 * Register block and assets
 * ------------------------------------------------------------- */
add_action( 'init', 'wp_ai_slider_register_block' );
function wp_ai_slider_register_block() {

	wp_register_script(
		'wp-ai-slider-block',
		WP_AI_SLIDER_URL . 'assets/js/block.js',
		[ 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-api-fetch', 'wp-data' ],
		WP_AI_SLIDER_VERSION,
		true
	);

	wp_localize_script( 'wp-ai-slider-block', 'wpAiSliderData', [
		'restUrl' => rest_url( 'wp-ai-slider/v1' ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'version' => WP_AI_SLIDER_VERSION,
	] );

	wp_register_style(
		'wp-ai-slider-editor',
		WP_AI_SLIDER_URL . 'assets/css/block-editor.css',
		[ 'wp-edit-blocks' ],
		WP_AI_SLIDER_VERSION
	);

	wp_register_style(
		'wp-ai-slider-frontend',
		WP_AI_SLIDER_URL . 'assets/css/frontend.css',
		[],
		WP_AI_SLIDER_VERSION
	);

	wp_register_script(
		'wp-ai-slider-frontend',
		WP_AI_SLIDER_URL . 'assets/js/frontend.js',
		[],
		WP_AI_SLIDER_VERSION,
		true
	);

	register_block_type( 'wp-ai-slider/slider', [
		'api_version'     => 2,
		'editor_script'   => 'wp-ai-slider-block',
		'editor_style'    => 'wp-ai-slider-editor',
		'style'           => 'wp-ai-slider-frontend',
		'script'          => 'wp-ai-slider-frontend',
		'render_callback' => 'wp_ai_slider_render_block',
		'attributes'      => [
			// Content
			'slides'           => [ 'type' => 'array',   'default' => [], 'items' => [ 'type' => 'object' ] ],
			// Layout
			'align'            => [ 'type' => 'string',  'default' => '' ],
			'sliderHeight'     => [ 'type' => 'number',  'default' => 500 ],
			'imageFit'         => [ 'type' => 'string',  'default' => 'cover' ],
			// Behaviour
			'autoplay'         => [ 'type' => 'boolean', 'default' => true ],
			'autoplayInterval' => [ 'type' => 'number',  'default' => 5000 ],
			'animationType'    => [ 'type' => 'string',  'default' => 'fade' ],
			'showArrows'       => [ 'type' => 'boolean', 'default' => true ],
			'showDots'         => [ 'type' => 'boolean', 'default' => true ],
			// Overlay
			'overlayColor'     => [ 'type' => 'string',  'default' => '#000000' ],
			'overlayOpacity'   => [ 'type' => 'number',  'default' => 40 ],
			// Typography
			'textColor'        => [ 'type' => 'string',  'default' => '#ffffff' ],
			'textAlign'        => [ 'type' => 'string',  'default' => 'center' ],
			'fontFamily'       => [ 'type' => 'string',  'default' => 'inherit' ],
			'headingSize'      => [ 'type' => 'number',  'default' => 48 ],
			'subtextSize'      => [ 'type' => 'number',  'default' => 20 ],
			'fontWeight'       => [ 'type' => 'string',  'default' => '700' ],
			'textShadow'       => [ 'type' => 'boolean', 'default' => true ],
			'borderRadius'     => [ 'type' => 'number',  'default' => 0 ],
			'imagePosition'    => [ 'type' => 'string',  'default' => 'center center' ],
		],
	] );
}

/* ---------------------------------------------------------------
 * REST API
 * ------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	$api = new WP_AI_Slider_REST_API();
	$api->register_routes();
} );

/* ---------------------------------------------------------------
 * Block render callback
 * ------------------------------------------------------------- */
function wp_ai_slider_render_block( $attributes ) {

	$slides    = $attributes['slides']           ?? [];
	$autoplay  = $attributes['autoplay']         ?? true;
	$interval  = intval( $attributes['autoplayInterval'] ?? 5000 );
	$dots      = $attributes['showDots']         ?? true;
	$arrows    = $attributes['showArrows']       ?? true;
	$height    = intval( $attributes['sliderHeight']     ?? 500 );
	$opacity   = intval( $attributes['overlayOpacity']   ?? 40 );
	$txtColor  = $attributes['textColor']        ?? '#ffffff';
	$ovColor   = $attributes['overlayColor']     ?? '#000000';
	$txtAlign  = $attributes['textAlign']        ?? 'center';
	$animation = $attributes['animationType']    ?? 'fade';
	$imageFit  = $attributes['imageFit']         ?? 'cover';
	$fontFam   = $attributes['fontFamily']       ?? 'inherit';
	$hSize     = intval( $attributes['headingSize']      ?? 48 );
	$sSize     = intval( $attributes['subtextSize']      ?? 20 );
	$fWeight   = $attributes['fontWeight']       ?? '700';
	$tShadow   = $attributes['textShadow']       ?? true;
	$blkAlign  = $attributes['align']            ?? '';
	$borderRad = intval( $attributes['borderRadius']     ?? 0 );
	$imgPos    = $attributes['imagePosition']    ?? 'center center';

	// Filter slides to only those with an image
	$valid_slides = array_values( array_filter( $slides, function( $s ) {
		return ! empty( $s['imageWebUrl'] ) || ! empty( $s['imageUrl'] );
	} ) );

	if ( empty( $valid_slides ) ) {
		return '';
	}

	$overlay_rgba = wp_ai_slider_hex_to_rgba( $ovColor, $opacity );
	$slider_id    = 'wpais-' . wp_unique_id();
	$shadow_css   = $tShadow ? '0 2px 16px rgba(0,0,0,0.55)' : 'none';

	// Resolve font family to a full CSS stack
	$font_stacks = [
		'inherit'    => 'inherit',
		'sans'       => '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif',
		'serif'      => 'Georgia, "Times New Roman", Times, serif',
		'trebuchet'  => '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
		'impact'     => 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
		'georgia'    => 'Georgia, Palatino, "Palatino Linotype", serif',
		'palatino'   => '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
		'verdana'    => 'Verdana, Geneva, Tahoma, sans-serif',
		'courier'    => '"Courier New", Courier, monospace',
	];
	$font_css = $font_stacks[ $fontFam ] ?? 'inherit';

	// Content alignment → flexbox align-items
	$flex_align = [ 'left' => 'flex-start', 'right' => 'flex-end', 'center' => 'center' ];
	$ai = $flex_align[ $txtAlign ] ?? 'center';

	// Block-level alignment class (wide / full)
	$align_class = $blkAlign ? ' align' . esc_attr( $blkAlign ) : '';

	ob_start();
?>
<div class="wp-block-wp-ai-slider-slider<?php echo $align_class; ?>">
<div class="wp-ai-slider-wrapper wp-ai-slider-<?php echo esc_attr( $animation ); ?>-mode"
     id="<?php echo esc_attr( $slider_id ); ?>"
     data-autoplay="<?php echo $autoplay ? 'true' : 'false'; ?>"
     data-interval="<?php echo esc_attr( $interval ); ?>"
     data-animation="<?php echo esc_attr( $animation ); ?>"
     style="height:<?php echo $height; ?>px;<?php if($borderRad>0) echo 'border-radius:'.intval($borderRad).'px;overflow:hidden;'; ?>"
     role="region" aria-label="Image Slider" tabindex="0">

	<div class="wp-ai-slider-track">
		<?php foreach ( $valid_slides as $i => $slide ) :
			$img_url = esc_url( $slide['imageUrl'] ?? $slide['imageWebUrl'] ?? '' );
			$hero    = wp_kses_post( $slide['heroText']    ?? '' );
			$sub     = wp_kses_post( $slide['heroSubtext'] ?? '' );
		?>
		<div class="wp-ai-slider-slide<?php echo $i === 0 ? ' active' : ''; ?>"
		     style="--wpais-overlay:<?php echo esc_attr( $overlay_rgba ); ?>;background-image:url('<?php echo $img_url; ?>');background-size:<?php echo esc_attr( $imageFit ); ?>;background-repeat:no-repeat;background-position:<?php echo esc_attr( $imgPos ); ?>;"
		     role="group" aria-label="Slide <?php echo $i + 1; ?>"
		     aria-hidden="<?php echo $i === 0 ? 'false' : 'true'; ?>">

			<div class="wp-ai-slider-content"
			     style="text-align:<?php echo esc_attr( $txtAlign ); ?>;align-items:<?php echo esc_attr( $ai ); ?>;">

				<?php if ( $hero ) : ?>
				<h2 class="wp-ai-slider-hero-text" style="color:<?php echo esc_attr( $txtColor ); ?>;font-family:<?php echo esc_attr( $font_css ); ?>;font-size:<?php echo $hSize; ?>px;font-weight:<?php echo esc_attr( $fWeight ); ?>;text-shadow:<?php echo esc_attr( $shadow_css ); ?>;"><?php echo $hero; ?></h2>
				<?php endif; ?>

				<?php if ( $sub ) : ?>
				<p class="wp-ai-slider-hero-subtext" style="color:<?php echo esc_attr( $txtColor ); ?>;font-family:<?php echo esc_attr( $font_css ); ?>;font-size:<?php echo $sSize; ?>px;text-shadow:<?php echo esc_attr( $shadow_css ); ?>;"><?php echo $sub; ?></p>
				<?php endif; ?>

			</div>
		</div>
		<?php endforeach; ?>
	</div>

	<?php if ( $arrows && count( $valid_slides ) > 1 ) : ?>
	<button class="wp-ai-slider-arrow wp-ai-slider-prev" aria-label="Previous slide">&#10094;</button>
	<button class="wp-ai-slider-arrow wp-ai-slider-next" aria-label="Next slide">&#10095;</button>
	<?php endif; ?>

	<?php if ( $dots && count( $valid_slides ) > 1 ) : ?>
	<div class="wp-ai-slider-dots" role="tablist" aria-label="Slide navigation">
		<?php foreach ( $valid_slides as $i => $slide ) : ?>
		<button class="wp-ai-slider-dot<?php echo $i === 0 ? ' active' : ''; ?>"
		        data-index="<?php echo $i; ?>"
		        role="tab"
		        aria-label="Slide <?php echo $i + 1; ?>"
		        aria-selected="<?php echo $i === 0 ? 'true' : 'false'; ?>"></button>
		<?php endforeach; ?>
	</div>
	<?php endif; ?>

</div><!-- /.wp-ai-slider-wrapper -->
</div><!-- /.wp-block-wp-ai-slider-slider -->
<?php
	return ob_get_clean();
}

/* ---------------------------------------------------------------
 * Helper: hex colour to rgba
 * ------------------------------------------------------------- */
function wp_ai_slider_hex_to_rgba( $color, $opacity ) {
	$alpha = round( $opacity / 100, 2 );

	// ColorPalette can return rgb() or rgba() strings — parse and rebuild with correct alpha
	if ( preg_match( '/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i', $color, $m ) ) {
		return "rgba({$m[1]},{$m[2]},{$m[3]},{$alpha})";
	}

	// Hex colour
	$hex = ltrim( $color, '#' );
	if ( strlen( $hex ) === 3 ) {
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}
	if ( strlen( $hex ) !== 6 ) {
		return "rgba(0,0,0,{$alpha})";
	}
	$r = hexdec( substr( $hex, 0, 2 ) );
	$g = hexdec( substr( $hex, 2, 2 ) );
	$b = hexdec( substr( $hex, 4, 2 ) );
	return "rgba($r,$g,$b,$alpha)";
}

/* ---------------------------------------------------------------
 * Activation
 * ------------------------------------------------------------- */
register_activation_hook( __FILE__, function () {
	if ( ! get_option( 'wp_ai_slider_settings' ) ) {
		update_option( 'wp_ai_slider_settings', [
			'openrouter_api_key' => '',
			'pixabay_api_key'    => '',
			'ai_model'           => 'openai/gpt-3.5-turbo',
		] );
	}
} );

register_deactivation_hook( __FILE__, function () {} );

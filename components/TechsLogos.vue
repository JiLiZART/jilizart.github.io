<template>
  <div class="techs-logos" aria-label="Спсисок технологий которые знаю" role="list" tab-index="">
    <span class="techs-logos__icon techs-logos__icon_js" role="listitem" title="Javascript"></span>
    <span class="techs-logos__icon techs-logos__icon_node" role="listitem" title="Node.js"></span>
    <span class="techs-logos__icon techs-logos__icon_react" role="listitem" title="React"></span>
    <span class="techs-logos__icon techs-logos__icon_vue" role="listitem" title="Vue 2"></span>
    <span class="techs-logos__icon techs-logos__icon_ng4" role="listitem" title="Angular 4"></span>
    <span class="techs-logos__icon techs-logos__icon_bem" role="listitem" title="BEM"></span>
    <span class="techs-logos__icon techs-logos__icon_html5" role="listitem" title="HTML5"></span>
    <span class="techs-logos__icon techs-logos__icon_css3" role="listitem" title="CSS3"></span>
    <span class="techs-logos__icon techs-logos__icon_stylus" role="listitem" title="Stylus"></span>
    <span class="techs-logos__icon techs-logos__icon_less" role="listitem" title="Less"></span>
    <span class="techs-logos__icon techs-logos__icon_sass" role="listitem" title="Sass"></span>
    <span class="techs-logos__icon techs-logos__icon_php" role="listitem" title="PHP 5/7"></span>
    <span class="techs-logos__icon techs-logos__icon_yii" role="listitem" title="Yii2"></span>
    <span class="techs-logos__icon techs-logos__icon_gulp" role="listitem" title="Gulp"></span>
    <span class="techs-logos__icon techs-logos__icon_webpack" role="listitem" title="Webpack 3"></span>
    <span class="techs-logos__icon techs-logos__icon_jquery" role="listitem" title="jQuery"></span>
  </div>
</template>

<script>
  export default {
    name: 'TechsLogos',
    props: {},
    components: {}
  }
</script>

<style lang="stylus">
  $ctx = techs-logos

  .{$ctx} {
    &__icon {
      display inline-block
      vertical-align top
      width 2rem
      height 2rem
      background-repeat no-repeat
      background-position 50% 50%
      background-size 100% 100%
      margin-right 1rem
      margin-bottom 1rem
    }

    &__icon_js {
      background-image url('../assets/techs/js.svg')
    }
    &__icon_node {
      background-image url('../assets/techs/nodejs.svg')
    }
    &__icon_react {
      background-image url('../assets/techs/react.svg')
    }
    &__icon_vue {
      background-image url('../assets/techs/vue.svg')
    }
    &__icon_ng4 {
      background-image url('../assets/techs/ng4.svg')
    }
    &__icon_bem {
      background-image url('../assets/techs/bem.svg')
    }
    &__icon_html5 {
      background-image url('../assets/techs/html5.svg')
    }
    &__icon_css3 {
      background-image url('../assets/techs/css3.svg')
    }
    &__icon_stylus {
      background-image url('../assets/techs/stylus.svg')
    }
    &__icon_less {
      background-image url('../assets/techs/less.svg')
    }
    &__icon_sass {
      background-image url('../assets/techs/sass.svg')
    }
    &__icon_php {
      background-image url('../assets/techs/php.svg')
    }
    &__icon_yii {
      background-image url('../assets/techs/yii.svg')
    }
    &__icon_gulp {
      background-image url('../assets/techs/gulp.svg')
    }
    &__icon_webpack {
      background-image url('../assets/techs/webpack.svg')
    }
    &__icon_jquery {
      background-image url('../assets/techs/jquery.svg')
    }
  }

</style>

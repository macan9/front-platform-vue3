<template>
  <router-view/>
</template>

<script>
  export default {

  }
</script>
<style>
html.fullscreen-interaction-lock,
body.fullscreen-interaction-lock,
html.fullscreen-interaction-lock *,
body.fullscreen-interaction-lock * {
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-touch-callout: none !important;
}

#app {
  height: 100%;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; 影响太多 */
  color: #2c3e50;
}
</style>

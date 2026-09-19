<template>
  <figure class="collab-figure">
    <img :src="src" :alt="alt || caption" class="collab-figure__img" />
    <figcaption v-if="caption" class="collab-figure__caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<script setup>
defineProps({
  src: { type: String, required: true },
  caption: { type: String, default: '' },
  alt: { type: String, default: '' },
})
</script>

<style scoped>
.collab-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.collab-figure__img {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 0.25rem;
}

.collab-figure__caption {
  margin-top: 0.5rem;
  font-size: 0.8rem !important;
  font-style: italic;
  line-height: 1.3 !important;
  color: var(--color-dark-gray, rgb(102, 102, 102));
  text-align: center;
}
</style>

  'use strict';

  /**
      * PhysiXplore Integration - module catalog (Phase 1).
      * Built-in snapshot of the qvlabs.space PhysiXplore modules. Pure data + helpers.
      * Used as the dry-run source; fetcher.js can refresh this when live fetch is on.
      */

  const SOURCE_URL = 'https://qvlabs.space';

  // Snapshot of the 21 modules (name + studio label + canonical slug).
  // videoUrl is null until a video source is provided.
  const MODULES = [
       { id: 1,   topic: 'Classical Mechanics', studio: 'MotionLab',       slug: 'classical-mechanics', videoUrl: null },
       { id: 2,   topic: 'Waves & Oscillations', studio: 'WaveCraft',      slug: 'waves-oscillations', videoUrl: null },
       { id: 3,   topic: 'Thermodynamics',      studio: 'ThermoVision',    slug: 'thermodynamics',       videoUrl: null },
       { id: 4,   topic: 'Quantum Mechanics',   studio: 'QuantumBox 3D',   slug: 'quantum-mechanics',    videoUrl: null },
       { id: 5,   topic: 'Electromagnetism',    studio: 'EM-Field Studio',slug: 'electromagnetism',      videoUrl: null },
       { id: 6,   topic: 'Relativity',          studio: 'RelativityLab', slug: 'relativity',             videoUrl: null },
       { id: 7,   topic: 'Acoustics',           studio: 'SoundWave Studio',slug: 'acoustics',            videoUrl: null },
       { id: 8,   topic: 'Collisions',          studio: 'ImpactLab',      slug: 'collisions',            videoUrl: null },
       { id: 9, topic: 'Optics',                studio: 'LightBench',      slug: 'optics',               videoUrl: null },
       { id: 10, topic: 'Nuclear Physics',      studio: 'NucleoScope',     slug: 'nuclear-physics',      videoUrl: null },
       { id: 11, topic: 'Astrophysics',         studio: 'CosmoSim',        slug: 'astrophysics',         videoUrl: null },
       { id: 12, topic: 'Biophysics',           studio: 'BioPhysica',      slug: 'biophysics',           videoUrl: null },
       { id: 13, topic: 'Fluid Dynamics',       studio: 'FlowViz',         slug: 'fluid-dynamics',       videoUrl: null },
       { id: 14, topic: 'Geophysics',           studio: 'GeoScope',        slug: 'geophysics',           videoUrl: null },
       { id: 15, topic: 'Solid State',          studio: 'CrystalLab',      slug: 'solid-state',          videoUrl: null },
       { id: 16, topic: 'Plasma Physics',       studio: 'PlasmaLab',       slug: 'plasma-physics',       videoUrl: null },
       { id: 17, topic: 'Projectile Motion', studio: 'MotionLab',          slug: 'projectile-motion',    videoUrl: null },
       { id: 18, topic: 'Simple Harmonic Motion', studio: 'WaveCraft',     slug: 'shm',                  videoUrl: null },
       { id: 19, topic: 'Wave Visualization',   studio: 'WaveCraft',       slug: 'wave-visualization',   videoUrl: null },
       { id: 20, topic: 'Chaos Theory',         studio: 'ChaosLab',        slug: 'chaos-theory',         videoUrl: null },
       { id: 21, topic: 'Nuclear Decay',        studio: 'NucleoScope',     slug: 'nuclear-decay',        videoUrl: null }
  ];

  // Mutable runtime copy (fetcher may replace this).
  let current = MODULES.slice();

  function all() { return current.slice(); }
  function count() { return current.length; }
  function get(id) {
    const n = parseInt(id, 10);
       return current.find(function (m) { return m.id === n; }) || null;
  }
  function findByName(q) {
    const s = String(q || '').toLowerCase().trim();


   if (!s) return null;
   return current.find(function (m) {
     return m.topic.toLowerCase().indexOf(s) !== -1 || m.studio.toLowerCase().indexOf(s) !== -1;
   }) || null;
}
function linkFor(m) { return SOURCE_URL + '/sims/' + m.slug; }
function replaceAll(list) { if (Array.isArray(list) && list.length) current = list.slice(); return current.length; }

module.exports = { SOURCE_URL, MODULES, all, count, get, findByName, linkFor, replaceAll };

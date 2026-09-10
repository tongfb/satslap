window.SATSLAP_CONFIG = {
  gameTitle: 'SAT SLAP',
  subtitle: 'HODL White vs. FIAT Sheep',
  durationSeconds: 60,
  blackSheepReward: 108,
  whiteSheepPenalty: 108,
  blackSheepProbability: 0.68,
  startPopMs: 1050,
  endPopMs: 620,
  backgroundMusicVolume: 0.22,
  sfxVolume: 0.92,
  maxNameLength: 20,
  donateAddress: 'donate@zapm.uk'
};

(() => {
  const script = document.createElement('script');
  script.src = 'halloffame.js';
  script.defer = true;
  document.head.appendChild(script);
})();

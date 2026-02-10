import { immediatelyActivateUpdateOnSignalSW } from '@budarin/pluggable-serviceworker/sw';

const version = '1.0.0';
const cacheName = 'offline-demo-v1';
const assets = ['/', '/assets/main.js', '/assets/service-worker.js'];

immediatelyActivateUpdateOnSignalSW({ assets, cacheName, version });

/**
 * Декларации типов для Background Fetch API (экспериментальный API).
 * Спецификация: https://wicg.github.io/background-fetch/
 */

declare global {
    interface ImageResource {
        src: string;
        sizes?: string;
        type?: string;
        label?: string;
    }

    interface BackgroundFetchUIOptions {
        title?: string;
        icons?: ImageResource[];
        downloadTotal?: number;
    }

    interface BackgroundFetchRegistration {
        readonly id: string;
        readonly uploadTotal: number;
        readonly uploaded: number;
        readonly downloadTotal: number;
        readonly downloaded: number;
        readonly result: '' | 'success' | 'failure' | 'abort';
        readonly failureReason: '' | 'aborted' | 'bad-status' | 'fetch-error' | 'quota-exceeded' | 'download-total-exceeded';
        abort(): Promise<boolean>;
        addEventListener(type: 'progress', listener: () => void): void;
        removeEventListener(type: 'progress', listener: () => void): void;
    }

    interface BackgroundFetchManager {
        fetch(
            id: string,
            requests: (string | Request)[],
            options?: BackgroundFetchUIOptions
        ): Promise<BackgroundFetchRegistration>;
        get(id: string): Promise<BackgroundFetchRegistration | undefined>;
        getIds(): Promise<string[]>;
    }

    interface BackgroundFetchEvent extends ExtendableEvent {
        readonly registration: BackgroundFetchRegistration;
    }

    interface BackgroundFetchUpdateUIEvent extends BackgroundFetchEvent {
        updateUI(options: { title?: string; icons?: ImageResource[] }): void;
    }

    interface ServiceWorkerRegistration {
        readonly backgroundFetch?: BackgroundFetchManager;
    }
}

export {};

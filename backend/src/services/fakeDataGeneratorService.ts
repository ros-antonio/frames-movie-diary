import { faker } from '@faker-js/faker';
import type { Movie } from '../types.js';
import { movieService, type MovieInput } from './movieService.js';
import { store } from '../repositories/inMemoryStore.js';
import { broadcastRealtime } from '../realtime/wsHub.js';

export interface GeneratorConfig {
  batchSize: number;
  intervalMs: number;
}

interface GeneratorStatus {
  running: boolean;
  batchSize: number;
  intervalMs: number;
}

interface StartResult {
  started: boolean;
  status: GeneratorStatus;
}

interface StopResult {
  stopped: boolean;
  status: GeneratorStatus;
}

const defaultConfig: GeneratorConfig = {
  batchSize: 3,
  intervalMs: 3_000,
};

class FakeDataGeneratorService {
  private running = false;

  private timer: NodeJS.Timeout | null = null;

  private config: GeneratorConfig = defaultConfig;

  start(config?: Partial<GeneratorConfig>): StartResult {
    if (this.running) {
      return {
        started: false,
        status: this.getStatus(),
      };
    }

    this.config = {
      ...defaultConfig,
      ...config,
    };
    this.running = true;
    this.createBatch();
    this.scheduleNextRun();

    return {
      started: true,
      status: this.getStatus(),
    };
  }

  stop(): StopResult {
    if (!this.running) {
      return {
        stopped: false,
        status: this.getStatus(),
      };
    }

    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    return {
      stopped: true,
      status: this.getStatus(),
    };
  }

  getStatus(): GeneratorStatus {
    return {
      running: this.running,
      batchSize: this.config.batchSize,
      intervalMs: this.config.intervalMs,
    };
  }

  private scheduleNextRun(): void {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(() => {
      this.createBatch();
      this.scheduleNextRun();
    }, this.config.intervalMs);
  }

  private createBatch(): void {
    const createdMovies: Movie[] = [];

    for (let index = 0; index < this.config.batchSize; index += 1) {
      createdMovies.push(movieService.create(this.generateMovieInput()));
    }

    broadcastRealtime('movies.batchCreated', {
      count: createdMovies.length,
      totalMovies: store.movies.size,
      movies: createdMovies,
    });
  }

  private generateMovieInput(): MovieInput {
    const watchedOn = faker.date.between({
      from: '2010-01-01T00:00:00.000Z',
      to: new Date(),
    });
    const includeRating = faker.number.float({ min: 0, max: 1 }) < 0.8;
    const includeReview = faker.number.float({ min: 0, max: 1 }) < 0.55;
    const includeMovieLink = faker.number.float({ min: 0, max: 1 }) < 0.5;

    const movieInput: MovieInput = {
      movieName: `${faker.word.adjective()} ${faker.word.noun()}`,
      watchDate: watchedOn.toISOString().slice(0, 10),
    };

    if (includeRating) {
      movieInput.rating = faker.helpers.arrayElement([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    }

    if (includeReview) {
      movieInput.review = faker.lorem.sentence({ min: 4, max: 16 });
    }

    if (includeMovieLink) {
      movieInput.movieLink = faker.internet.url();
    }

    return movieInput;
  }
}

export const fakeDataGeneratorService = new FakeDataGeneratorService();



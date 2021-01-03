import { TestBed } from '@angular/core/testing';

import { ActivityGraphService } from './activity-graph.service';

describe('ActivityGraphService', () => {
  let service: ActivityGraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActivityGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

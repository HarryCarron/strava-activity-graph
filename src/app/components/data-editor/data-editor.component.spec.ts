import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DataEditorComponent } from './data-editor.component';

describe('DataEditorComponent', () => {
  let component: DataEditorComponent;
  let fixture: ComponentFixture<DataEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DataEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

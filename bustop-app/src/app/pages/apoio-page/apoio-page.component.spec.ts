import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApoioPageComponent } from './apoio-page.component';

describe('ApoioPageComponent', () => {
  let component: ApoioPageComponent;
  let fixture: ComponentFixture<ApoioPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApoioPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApoioPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

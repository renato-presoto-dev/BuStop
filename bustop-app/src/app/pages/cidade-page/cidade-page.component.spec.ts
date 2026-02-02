import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CidadePageComponent } from './cidade-page.component';

describe('CidadePageComponent', () => {
  let component: CidadePageComponent;
  let fixture: ComponentFixture<CidadePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CidadePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CidadePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

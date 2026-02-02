import { Component } from '@angular/core';
import {ChangeDetectionStrategy} from '@angular/core';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-cidade-page',
  standalone: true,
  imports: [ MatFormFieldModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cidade-page.component.html',
  styleUrl: './cidade-page.component.css'
})
export class CidadePageComponent {

}

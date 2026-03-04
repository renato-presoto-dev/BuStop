import { Component } from '@angular/core';
import {ChangeDetectionStrategy} from '@angular/core';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { NavbarComponent } from '../../components/navbar/navbar.component';
@Component({
  selector: 'app-horarios-page',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, NavbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './horarios-page.component.html',
  styleUrl: './horarios-page.component.css'
})
export class HorariosPageComponent {

}

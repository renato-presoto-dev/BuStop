import { Component } from '@angular/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatSliderModule} from '@angular/material/slider';
import { NavbarComponent } from "../../components/navbar/navbar.component";

@Component({
  selector: 'app-config-page',
  standalone: true,
  imports: [MatButtonToggleModule, MatSliderModule, NavbarComponent],
  templateUrl: './config-page.component.html',
  styleUrl: './config-page.component.css'
})
export class ConfigPageComponent {

}

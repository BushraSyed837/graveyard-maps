import { Component } from '@angular/core';
import { MapComponent } from './map/map.component';
import { GraveyardListComponent } from './graveyard-list/graveyard-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Graveyard Map';
}

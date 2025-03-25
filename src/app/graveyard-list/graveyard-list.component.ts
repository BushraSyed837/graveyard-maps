import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraveyardService } from '../services/graveyard.service';

@Component({
  selector: 'app-graveyard-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graveyard-list-container">
      <h2>All Graveyards</h2>
      <div class="loading" *ngIf="loading">Loading graveyards...</div>
      <div class="error" *ngIf="error">{{ error }}</div>
      <ul class="graveyard-list">
        <li *ngFor="let graveyard of graveyards">
          {{ graveyard.name }}
        </li>
      </ul>
      <div *ngIf="graveyards.length === 0 && !loading && !error" class="no-data">
        No graveyards found
      </div>
    </div>
  `,
  styles: [`
    .graveyard-list-container {
      padding: 20px;
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      margin: 20px;
      max-width: 500px;
    }
    
    h2 {
      margin-top: 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .graveyard-list {
      list-style-type: none;
      padding: 0;
    }
    
    .graveyard-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .loading, .error, .no-data {
      padding: 10px;
      text-align: center;
    }
    
    .error {
      color: red;
    }
    
    .no-data {
      color: #888;
      font-style: italic;
    }
  `]
})
export class GraveyardListComponent implements OnInit {
  graveyards: {id: string, name: string}[] = [];
  loading = true;
  error: string | null = null;

  constructor(private graveyardService: GraveyardService) {}

  ngOnInit(): void {
    this.loadGraveyards();
  }

  loadGraveyards(): void {
    this.loading = true;
    this.error = null;
    
    this.graveyardService.getGraveyardsList().subscribe(
      data => {
        this.graveyards = data;
        this.loading = false;
        console.log('GraveyardListComponent: Loaded', data.length, 'graveyards');
      },
      err => {
        this.error = 'Failed to load graveyards: ' + (err.message || 'Unknown error');
        this.loading = false;
        console.error('GraveyardListComponent: Error loading graveyards:', err);
      }
    );
  }
} 
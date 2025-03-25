import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraveyardService, GraveFeature } from '../services/graveyard.service';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapElement!: ElementRef;
  
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  
  map!: Map;
  gravesSource = new VectorSource();
  gravesLayer!: VectorLayer<any>;
  
  graveyards: {id: string, name: string}[] = [];
  selectedGraveyardId: string | null = null;
  uniqueStatuses: string[] = [];
  
  // Default colors for different statuses
  statusColors: Record<string, string> = {
    'Belegt (Grab ist vergeben)': '#f44336',    // Red for occupied graves
    'Freies Grab': '#4caf50',                   // Green for free graves
    'Nutzungsrecht zurückgegeben': '#ff9800',   // Orange for returned usage rights
    'Sonstiges': '#9c27b0',                     // Purple for miscellaneous
    'default': '#9e9e9e'                        // Grey for unknown status
  };

  // Status labels for display
  statusLabels: Record<string, string> = {
    'Belegt (Grab ist vergeben)': 'Occupied',
    'Freies Grab': 'Free',
    'Nutzungsrecht zurückgegeben': 'Usage Rights Returned',
    'Sonstiges': 'Miscellaneous',
    'default': 'Unknown Status'
  };

  constructor(private graveyardService: GraveyardService) {
    // Set up the projection if we're in the browser
    if (this.isBrowser) {
      // Define the projection for EPSG:25832
      proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
      register(proj4);
    }
  }

  ngOnInit(): void {
    this.loadGraveyardsList();
    this.loadUniqueStatuses();
  }

  ngAfterViewInit(): void {
    // Only initialize map in browser context
    if (this.isBrowser) {
      this.initMap();
    }
  }

  initMap(): void {
    if (!this.mapElement?.nativeElement) {
      console.error('Map element not found');
      return;
    }

    try {
      this.gravesLayer = new VectorLayer({
        source: this.gravesSource,
        style: (feature) => {
          const status = feature.get('grabstatus') || 'default';
          const color = this.statusColors[status] || this.statusColors['default'];
          console.log('Feature status:', status, 'Applied color:', color);
          
          return new Style({
            fill: new Fill({
              color: color + '80' // Add 50% transparency
            }),
            stroke: new Stroke({
              color: color,
              width: 2
            })
          });
        }
      });

      this.map = new Map({
        target: this.mapElement.nativeElement,
        layers: [
          new TileLayer({
            source: new OSM()
          }),
          this.gravesLayer
        ],
        view: new View({
          center: fromLonLat([10.4515, 51.1657]), // Center of Germany
          zoom: 6
        })
      });

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  loadGraveyardsList(): void {
    this.graveyardService.getGraveyardsList().subscribe(
      graveyards => {
        this.graveyards = graveyards;
        console.log('Loaded graveyards:', graveyards);
        
        // If we have graveyards, select the first one by default
        if (this.isBrowser && this.graveyards.length > 0) {
          this.selectedGraveyardId = this.graveyards[0].id;
          console.log('Auto-selecting graveyard:', this.selectedGraveyardId);
          this.onGraveyardChange({ target: { value: this.selectedGraveyardId } } as any);
        }
      },
      error => {
        console.error('Error loading graveyards list:', error);
      }
    );
  }

  loadUniqueStatuses(): void {
    this.graveyardService.getUniqueGrabstatusValues().subscribe(
      statuses => {
        this.uniqueStatuses = statuses;
        console.log('Loaded unique statuses:', statuses);
      },
      error => {
        console.error('Error loading unique statuses:', error);
      }
    );
  }

  onGraveyardChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const graveyardId = select.value;
    this.selectedGraveyardId = graveyardId;
    console.log('Selected graveyard changed to:', graveyardId);
    
    // Only continue if we're in browser context
    if (!this.isBrowser) return;
    
    // Clear previous graves
    this.gravesSource.clear();
    
    if (graveyardId) {
      // Load graves for the selected graveyard
      console.log('Loading graves for graveyard:', graveyardId);
      this.graveyardService.getGravesByGraveyardId(graveyardId).subscribe(
        data => {
          console.log('Received GeoJSON data:', data);
          
          try {
            // Transform geojson to features with correct projection
            const features = new GeoJSON({
              dataProjection: 'EPSG:25832',
              featureProjection: 'EPSG:3857'
            }).readFeatures(data);
            
            console.log('Transformed features:', features);
            console.log('First feature properties:', features[0]?.getProperties());
            
            if (features.length > 0) {
              // Add features to the source
              this.gravesSource.addFeatures(features);
              
              // Log unique statuses in the features
              const uniqueStatuses = [...new Set(features.map(f => f.get('grabstatus')))];
              console.log('Unique statuses in features:', uniqueStatuses);
              
              // Fit the view to the extent of the features
              const extent = this.gravesSource.getExtent();
              console.log('Feature extent:', extent);
              
              if (extent && !isNaN(extent[0])) {
                this.map.getView().fit(extent, {
                  padding: [50, 50, 50, 50],
                  duration: 1000,
                  maxZoom: 19
                });
              } else {
                console.warn('Invalid extent, using default view');
                // Set a fallback center and zoom if the extent is invalid
                this.map.getView().setCenter(fromLonLat([10.4515, 51.1657]));
                this.map.getView().setZoom(6);
              }
            } else {
              console.warn('No features found for the selected graveyard');
            }
          } catch (error) {
            console.error('Error processing GeoJSON data:', error);
          }
        },
        error => {
          console.error('Error loading graveyard data:', error);
        }
      );
    }
  }
}

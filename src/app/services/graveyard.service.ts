import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap } from 'rxjs';

export interface GraveFeature {
  type: string;
  properties: {
    friedhof: string;
    grabnummer: string;
    grabRotation: number;
    grabstatus: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface GeoJsonResponse {
  type: string;
  features: Array<GraveFeature>;
}

@Injectable({
  providedIn: 'root'
})
export class GraveyardService {
  private dataUrl = 'assets/test_data.geojson';

  constructor(private http: HttpClient) {}

  getData(): Observable<GeoJsonResponse> {
    console.log('GraveyardService: Fetching data from', this.dataUrl);
    return this.http.get<GeoJsonResponse>(this.dataUrl).pipe(
      tap(data => console.log('GraveyardService: Received data with', data.features?.length || 0, 'features')),
      catchError(error => {
        console.error('GraveyardService: Error loading GeoJSON from', this.dataUrl, error);
        // Return an empty GeoJSON structure if there's an error
        return of({
          type: 'FeatureCollection',
          features: []
        });
      })
    );
  }

  getGraveyardsList(): Observable<{id: string, name: string}[]> {
    console.log('GraveyardService: Getting graveyards list');
    return this.getData().pipe(
      map(response => {
        // Extract unique friedhof names
        const uniqueFriedhofs = new Set<string>();
        
        // Log each graveyard name for debugging
        response.features.forEach(feature => {
          if (feature.properties && feature.properties.friedhof) {
            console.log('Found graveyard:', feature.properties.friedhof);
            uniqueFriedhofs.add(feature.properties.friedhof);
          } else {
            console.warn('Feature missing friedhof property:', feature);
          }
        });
        
        // Convert the Set to an array for better debugging
        const uniqueGraveyardArray = Array.from(uniqueFriedhofs);
        console.log('GraveyardService: Found unique graveyards:', uniqueGraveyardArray);
        
        // Handle case where no graveyards are found
        if (uniqueGraveyardArray.length === 0) {
          console.warn('No graveyards found in the data. Adding a default entry.');
          return [{ id: 'default', name: 'Default Graveyard' }];
        }
        
        // Convert to array of {id, name} objects
        return uniqueGraveyardArray.map(friedhof => ({
          id: friedhof,
          name: friedhof
        }));
      })
    );
  }

  getGravesByGraveyardId(graveyardId: string): Observable<GeoJsonResponse> {
    console.log('GraveyardService: Getting graves for graveyard', graveyardId);
    return this.getData().pipe(
      map(response => {
        const filteredFeatures = response.features.filter(feature => 
          feature.properties?.friedhof === graveyardId
        );
        
        console.log('GraveyardService: Found', filteredFeatures.length, 'graves for graveyard', graveyardId);
        
        return {
          type: 'FeatureCollection',
          features: filteredFeatures
        };
      })
    );
  }

  getUniqueGrabstatusValues(): Observable<string[]> {
    return this.getData().pipe(
      map(data => {
        const statuses = new Set<string>();
        data.features.forEach(feature => {
          const status = feature.properties.grabstatus;
          console.log('Processing status:', status);
          if (status) {
            statuses.add(status);
          }
        });
        const uniqueStatuses = Array.from(statuses);
        console.log('Unique statuses found:', uniqueStatuses);
        return uniqueStatuses;
      })
    );
  }

  // Helper method to get a specific graveyard's bounds
  getGraveyardExtent(graveyardId: string): Observable<number[][]> {
    console.log('GraveyardService: Calculating extent for graveyard', graveyardId);
    return this.getGravesByGraveyardId(graveyardId).pipe(
      map(data => {
        // If no features, return a default extent
        if (!data.features.length) {
          console.log('GraveyardService: No features found for extent calculation');
          return [[0, 0], [0, 0]];
        }
        
        // Calculate the combined extent of all graves in the graveyard
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        data.features.forEach(feature => {
          const coords = feature.geometry?.coordinates;
          
          if (feature.geometry?.type === 'Polygon' && coords && coords.length > 0) {
            // Polygon coordinates are arrays of rings, where each ring is an array of [x, y] points
            coords[0].forEach((point: number[]) => {
              if (point && point.length >= 2) {
                minX = Math.min(minX, point[0]);
                minY = Math.min(minY, point[1]);
                maxX = Math.max(maxX, point[0]);
                maxY = Math.max(maxY, point[1]);
              }
            });
          } else if (feature.geometry?.type === 'Point' && coords && coords.length >= 2) {
            // Point coordinates are just [x, y]
            minX = Math.min(minX, coords[0]);
            minY = Math.min(minY, coords[1]);
            maxX = Math.max(maxX, coords[0]);
            maxY = Math.max(maxY, coords[1]);
          }
        });
        
        const extent = [[minX, minY], [maxX, maxY]];
        console.log('GraveyardService: Calculated extent', extent);
        return extent;
      })
    );
  }
}

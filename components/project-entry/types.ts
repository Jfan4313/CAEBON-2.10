export interface EquipmentItem {
    id: number;
    name: string;
    type?: string; // For HVAC/Water categories
    health?: string; // New: For HVAC health/age
    cop?: number;    // New: For HVAC COP
    power: number; // kW (or W for lighting)
    count: number;
    param?: number; // Extra param like hours or area coverage
}

export interface Building {
    id: number;
    name: string;
    type: string;
    area: number;
    systems: {
        lighting: { 
            enabled: boolean; 
            mode: 'density' | 'list'; 
            density: number; // W/m2
            items: EquipmentItem[]; 
        };
        hvac: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
        water: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
        production: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
    };
}

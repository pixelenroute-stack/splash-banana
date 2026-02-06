
// Base de données des effets réels avec leurs limites
interface EffectDefinition {
    parameters: {
        [key: string]: {
            min?: number;
            max?: number;
            unit?: string;
            values?: string[];
        }
    }
}

const BLENDER_EFFECTS: Record<string, EffectDefinition> = {
    'Transform': {
        parameters: {
            'Location': { unit: 'm' },
            'Rotation': { unit: '°' },
            'Scale': { min: 0 }
        }
    },
    'Subdivision Surface': {
        parameters: {
            'Levels Viewport': { min: 0, max: 6 },
            'Render': { min: 0, max: 6 }
        }
    },
    'Bevel': {
        parameters: {
            'Amount': { min: 0, max: 10, unit: 'm' },
            'Segments': { min: 1, max: 100 },
            'Profile': { min: 0, max: 1 }
        }
    },
    'Boolean': {
        parameters: {
            'Operation': { values: ['Intersect', 'Union', 'Difference'] },
            'Solver': { values: ['Fast', 'Exact'] }
        }
    },
    'Array': {
        parameters: {
            'Count': { min: 1, max: 10000 },
            'Relative Offset': {},
            'Constant Offset': {}
        }
    },
    'Solidify': {
        parameters: {
            'Thickness': { unit: 'm' },
            'Offset': { min: -1, max: 1 }
        }
    },
    'Principled BSDF': {
        parameters: {
            'Base Color': {},
            'Metallic': { min: 0, max: 1 },
            'Roughness': { min: 0, max: 1 },
            'IOR': { min: 0, max: 3 },
            'Transmission': { min: 0, max: 1 },
            'Emission': {}
        }
    },
    'Extrude Region': {
        parameters: {
            'Move': { unit: 'm' }
        }
    },
    'Inset Faces': {
        parameters: {
            'Thickness': { unit: 'm' },
            'Depth': { unit: 'm' }
        }
    },
    'Loop Cut': {
        parameters: {
            'Number of Cuts': { min: 1 }
        }
    },
    'Camera Settings': {
        parameters: {
            'Focal Length': { min: 1, max: 1000, unit: 'mm' },
            'Clip Start': { min: 0.001 },
            'Clip End': {}
        }
    },
    'Light Settings': {
        parameters: {
            'Power': { min: 0, unit: 'W' },
            'Radius': { min: 0, unit: 'm' },
            'Color': {}
        }
    },
    'Render Settings': {
        parameters: {
            'Resolution X': { min: 1, unit: 'px' },
            'Resolution Y': { min: 1, unit: 'px' },
            'Frame Rate': { min: 1, unit: 'fps' },
            'Engine': { values: ['Eevee', 'Cycles', 'Workbench'] }
        }
    }
};

const PREMIERE_EFFECTS: Record<string, EffectDefinition> = {
  'Gaussian Blur': {
    parameters: {
      'Blurriness': { min: 0, max: 1000, unit: 'pixels' },
      'Blur Dimensions': { values: ['Horizontal', 'Vertical', 'Horizontal and Vertical'] }
    }
  },
  'Lumetri Color': {
    parameters: {
      'Exposure': { min: -5, max: 5, unit: 'stops' },
      'Contrast': { min: -100, max: 100, unit: '%' },
      'Highlights': { min: -100, max: 100, unit: '%' },
      'Shadows': { min: -100, max: 100, unit: '%' },
      'Whites': { min: -100, max: 100, unit: '%' },
      'Blacks': { min: -100, max: 100, unit: '%' },
      'Saturation': { min: 0, max: 200, unit: '%' },
      'Temperature': { min: -100, max: 100, unit: 'K' },
      'Tint': { min: -100, max: 100 },
      'Vibrance': { min: -100, max: 100 },
      'Sharpen': { min: 0, max: 100 }
    }
  },
  'Transform': {
    parameters: {
      'Scale': { min: 0, max: 10000, unit: '%' },
      'Position': { min: -10000, max: 10000 }, 
      'Rotation': { min: -36000, max: 36000, unit: 'degrees' },
      'Opacity': { min: 0, max: 100, unit: '%' },
      'Skew': { min: -180, max: 180 }
    }
  },
  'Warp Stabilizer': {
    parameters: {
      'Smoothness': { min: 0, max: 1000, unit: '%' },
      'Result': { values: ['Smooth Motion', 'No Motion'] }
    }
  },
  'Ultra Key': {
    parameters: {
      'Setting': { values: ['Default', 'Relaxed', 'Aggressive', 'Custom'] },
      'Matte Generation': { min: 0, max: 100 },
      'Transparency': { min: 0, max: 100 },
      'Pedestal': { min: 0, max: 100 }
    }
  },
  'Crop': {
    parameters: {
      'Left': { min: 0, max: 100, unit: '%' },
      'Top': { min: 0, max: 100, unit: '%' },
      'Right': { min: 0, max: 100, unit: '%' },
      'Bottom': { min: 0, max: 100, unit: '%' },
      'Edge Feather': { min: 0, max: 1000 }
    }
  },
  'Drop Shadow': {
    parameters: {
      'Opacity': { min: 0, max: 100, unit: '%' },
      'Direction': { min: 0, max: 360, unit: 'degrees' },
      'Distance': { min: 0, max: 1000 },
      'Softness': { min: 0, max: 1000 },
      'Shadow Color': {}
    }
  },
  'Basic 3D': {
    parameters: {
      'Swivel': { min: -360, max: 360, unit: 'degrees' },
      'Tilt': { min: -360, max: 360, unit: 'degrees' },
      'Distance to Image': { min: 0, max: 1000 }
    }
  },
  'Directional Blur': {
    parameters: {
      'Direction': { min: 0, max: 360, unit: 'degrees' },
      'Blur Length': { min: 0, max: 1000 }
    }
  },
  'Mosaic': {
    parameters: {
      'Horizontal Blocks': { min: 1, max: 2000 },
      'Vertical Blocks': { min: 1, max: 2000 }
    }
  },
  'Posterize Time': {
    parameters: {
      'Frame Rate': { min: 0.1, max: 120, unit: 'fps' }
    }
  },
  'Cross Dissolve': {
    parameters: {
      'Duration': { min: 0, max: 300, unit: 'frames' } 
    }
  },
  'Dip to Black': {
    parameters: {
      'Duration': { min: 0, max: 300, unit: 'frames' }
    }
  },
  'Track Matte Key': {
    parameters: {
      'Matte': { values: ['None', 'Video 1', 'Video 2', 'Video 3'] },
      'Composite Using': { values: ['Matte Alpha', 'Matte Luma'] }
    }
  },
  'Grain': {
      parameters: {
          'Intensity': { min: 0, max: 100 },
          'Size': { min: 0, max: 10 },
          'Color Noise': { min: 0, max: 100, unit: '%' }
      }
  }
};

const AFTER_EFFECTS_EFFECTS: Record<string, EffectDefinition> = {
  'Fast Box Blur': {
    parameters: {
      'Blur Radius': { min: 0, max: 1000, unit: 'pixels' },
      'Iterations': { min: 1, max: 5 }
    }
  },
  'Gaussian Blur': {
    parameters: {
      'Blurriness': { min: 0, max: 1000, unit: 'pixels' }
    }
  },
  'Curves': {
    parameters: {
      // Pas de limites fixes pour les courbes
    }
  },
  'CC Particle World': {
    parameters: {
      'Birth Rate': { min: 0, max: 100, unit: 'particles/s' },
      'Longevity': { min: 0, max: 10, unit: 'seconds' },
      'Gravity': { min: -5, max: 5 },
      'Velocity': { min: 0, max: 100 }
    }
  },
  'Fractal Noise': {
    parameters: {
      'Contrast': { min: 0, max: 500, unit: '%' },
      'Brightness': { min: -200, max: 200, unit: '%' },
      'Complexity': { min: 1, max: 20 },
      'Evolution': { min: 0, max: 3600, unit: 'degrees' }
    }
  },
  'Hue/Saturation': {
    parameters: {
      'Master Hue': { min: -180, max: 180, unit: 'degrees' },
      'Master Saturation': { min: -100, max: 100 },
      'Master Lightness': { min: -100, max: 100 }
    }
  },
  'Fill': {
    parameters: {
      'Opacity': { min: 0, max: 100, unit: '%' },
      'Color': {}
    }
  },
  'Stroke': {
    parameters: {
      'Brush Size': { min: 0, max: 200, unit: 'px' },
      'Opacity': { min: 0, max: 100, unit: '%' },
      'Start': { min: 0, max: 100, unit: '%' },
      'End': { min: 0, max: 100, unit: '%' }
    }
  },
  'Glow': {
    parameters: {
      'Glow Threshold': { min: 0, max: 100, unit: '%' },
      'Glow Radius': { min: 0, max: 1000, unit: 'pixels' },
      'Glow Intensity': { min: 0, max: 50 },
      'Composite Original': { values: ['On Top', 'Behind', 'None'] },
      'Glow Colors': { values: ['A&B Colors', 'Original Colors'] },
      'Color A': {},
      'Color B': {}
    }
  },
  'Linear Wipe': {
    parameters: {
      'Transition Completion': { min: 0, max: 100, unit: '%' },
      'Wipe Angle': { min: 0, max: 360, unit: 'degrees' },
      'Feather': { min: 0, max: 500 }
    }
  },
  'Radial Wipe': {
    parameters: {
      'Transition Completion': { min: 0, max: 100, unit: '%' },
      'Start Angle': { min: 0, max: 360, unit: 'degrees' },
      'Feather': { min: 0, max: 500 }
    }
  },
  'Turbulent Displace': {
    parameters: {
      'Amount': { min: 0, max: 500 },
      'Size': { min: 0, max: 500 },
      'Complexity': { min: 1, max: 10 }
    }
  },
  'Keylight (1.2)': {
    parameters: {
      'Screen Gain': { min: 0, max: 200 },
      'Screen Balance': { min: 0, max: 100 }
    }
  },
  'Drop Shadow': {
    parameters: {
      'Opacity': { min: 0, max: 100, unit: '%' },
      'Direction': { min: 0, max: 360, unit: 'degrees' },
      'Distance': { min: 0, max: 1000 },
      'Softness': { min: 0, max: 1000 },
      'Shadow Color': {}
    }
  },
  'Transform': {
    parameters: {
        'Opacity': { min: 0, max: 100, unit: '%' },
        'Scale': { min: 0, max: 5000, unit: '%' },
        'Rotation': { min: -36000, max: 36000 }
    }
  },
  'Composition Settings': {
      parameters: {
          'Width': { unit: 'px' },
          'Height': { unit: 'px' },
          'Frame Rate': { unit: 'fps' },
          'Duration': { unit: 'sec' },
          'Background Color': {}
      }
  },
  'Text Tool': {
      parameters: {
          'Font': {},
          'Font Size': { unit: 'px' },
          'Fill Color': {},
          'Tracking': {},
          'Alignment': {}
      }
  }
};

const PHOTOSHOP_EFFECTS: Record<string, EffectDefinition> = {
    'Gaussian Blur': {
        parameters: { 'Radius': { min: 0.1, max: 1000, unit: 'px' } }
    },
    'Motion Blur': {
        parameters: { 'Angle': { min: -360, max: 360, unit: '°' }, 'Distance': { min: 1, max: 2000, unit: 'px' } }
    },
    'Levels': {
        parameters: { 'Input Shadows': { min: 0, max: 255 }, 'Input Highlights': { min: 0, max: 255 }, 'Gamma': { min: 0.1, max: 9.99 } }
    },
    'Curves': {
        parameters: {}
    },
    'Hue/Saturation': {
        parameters: { 'Hue': { min: -180, max: 180 }, 'Saturation': { min: -100, max: 100 }, 'Lightness': { min: -100, max: 100 } }
    },
    'Layer Style': {
        parameters: { 
            'Style': { values: ['Drop Shadow', 'Inner Shadow', 'Outer Glow', 'Inner Glow', 'Bevel & Emboss', 'Satin', 'Color Overlay', 'Gradient Overlay', 'Pattern Overlay', 'Stroke'] },
            'Opacity': { min: 0, max: 100, unit: '%' },
            'Distance': { min: 0, max: 1000, unit: 'px' },
            'Size': { min: 0, max: 250, unit: 'px' }
        }
    },
    'Unsharp Mask': {
        parameters: { 'Amount': { min: 1, max: 500, unit: '%' }, 'Radius': { min: 0.1, max: 1000, unit: 'px' }, 'Threshold': { min: 0, max: 255 } }
    },
    'High Pass': {
        parameters: { 'Radius': { min: 0.1, max: 1000, unit: 'px' } }
    },
    'Camera Raw Filter': {
        parameters: { 'Exposure': {}, 'Contrast': {}, 'Highlights': {}, 'Shadows': {}, 'Texture': {}, 'Clarity': {}, 'Dehaze': {} }
    },
    'Liquify': {
        parameters: { 'Brush Size': {}, 'Brush Density': {}, 'Brush Pressure': {} }
    },
    'Select & Mask': {
        parameters: { 'Smooth': {}, 'Feather': {}, 'Contrast': {}, 'Shift Edge': {} }
    }
};

const ILLUSTRATOR_EFFECTS: Record<string, EffectDefinition> = {
    '3D Extrude & Bevel': {
        parameters: { 'Extrude Depth': { min: 0, max: 2000, unit: 'pt' }, 'Perspective': { min: 0, max: 160, unit: '°' } }
    },
    'Drop Shadow': {
        parameters: { 'Opacity': { min: 0, max: 100, unit: '%' }, 'X Offset': { unit: 'px' }, 'Y Offset': { unit: 'px' }, 'Blur': { unit: 'px' } }
    },
    'Gaussian Blur': {
        parameters: { 'Radius': { min: 0.1, max: 500, unit: 'px' } }
    },
    'Offset Path': {
        parameters: { 'Offset': { unit: 'px' }, 'Joins': { values: ['Miter', 'Round', 'Bevel'] } }
    },
    'Pathfinder': {
        parameters: { 'Mode': { values: ['Unite', 'Minus Front', 'Intersect', 'Exclude', 'Divide', 'Trim', 'Merge', 'Crop', 'Outline', 'Minus Back'] } }
    },
    'Blend Tool': {
        parameters: { 'Spacing': { values: ['Smooth Color', 'Specified Steps', 'Specified Distance'] }, 'Steps': { min: 1, max: 1000 } }
    },
    'Transform': {
        parameters: { 'Scale': { unit: '%' }, 'Move': { unit: 'px' }, 'Rotate': { unit: '°' }, 'Copies': { min: 0 } }
    },
    'Roughen': {
        parameters: { 'Size': { unit: '%' }, 'Detail': { unit: '/in' }, 'Points': { values: ['Smooth', 'Corner'] } }
    },
    'Zig Zag': {
        parameters: { 'Size': { unit: 'px' }, 'Ridges per segment': {}, 'Points': { values: ['Smooth', 'Corner'] } }
    },
    'Image Trace': {
        parameters: { 'Preset': {}, 'Mode': {}, 'Threshold': {}, 'Paths': {}, 'Corners': {}, 'Noise': {} }
    }
};

export interface TutorialStep {
  effect: string;
  parameters: Array<{
    name: string;
    value: string;
    unit?: string;
  }>;
  software: 'premiere' | 'after-effects' | 'photoshop' | 'illustrator' | 'blender';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class TutorialValidator {
  
  validate(tutorial: TutorialStep): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Sélection de la base de données appropriée
    let effectsDB: Record<string, EffectDefinition>;
    if (tutorial.software === 'premiere') effectsDB = PREMIERE_EFFECTS;
    else if (tutorial.software === 'after-effects') effectsDB = AFTER_EFFECTS_EFFECTS;
    else if (tutorial.software === 'photoshop') effectsDB = PHOTOSHOP_EFFECTS;
    else if (tutorial.software === 'illustrator') effectsDB = ILLUSTRATOR_EFFECTS;
    else if (tutorial.software === 'blender') effectsDB = BLENDER_EFFECTS;
    else return { valid: false, errors: ['Logiciel inconnu'], warnings: [] };
    
    // Attempt exact match first
    let effectDef = effectsDB[tutorial.effect];
    let matchedName = tutorial.effect;

    if (!effectDef) {
        // Try case-insensitive matching
        const foundKey = Object.keys(effectsDB).find(k => k.toLowerCase() === tutorial.effect.toLowerCase());
        if (foundKey) {
            effectDef = effectsDB[foundKey];
            matchedName = foundKey; // We'll use this for param validation
        } else {
            // Check for common aliases
            if (tutorial.software === 'after-effects' && tutorial.effect.toLowerCase() === 'fast blur') {
                effectDef = effectsDB['Fast Box Blur'];
            } else if (tutorial.software === 'premiere' && tutorial.effect.toLowerCase() === 'opacity') {
                effectDef = effectsDB['Transform'];
            } else {
                // Not found
                if (tutorial.parameters.length > 0) {
                    warnings.push(`Effet/Outil potentiellement inconnu ou non listé : "${tutorial.effect}". Vérifiez l'orthographe.`);
                }
                return { valid: true, errors, warnings }; // Soft pass
            }
        }
    }
    
    // 2. Vérifier chaque paramètre
    for (const param of tutorial.parameters) {
      // Find parameter definition (case insensitive)
      const paramKey = Object.keys(effectDef.parameters).find(k => k.toLowerCase() === param.name.toLowerCase());
      
      if (!paramKey) {
        continue;
      }
      
      const paramDef = effectDef.parameters[paramKey];
      const valueStr = param.value.replace('%', '').replace('px', '').replace('°', '').replace('pt', '').replace('m', '').replace('W', '').trim();
      const value = parseFloat(valueStr);
      
      if (isNaN(value)) continue; // Skip non-numeric values

      // 3. Vérifier les limites numériques
      if (paramDef.min !== undefined && value < paramDef.min) {
        errors.push(
          `${matchedName} > ${paramKey}: ${value} est inférieur à la limite min (${paramDef.min})`
        );
      }
      
      if (paramDef.max !== undefined && value > paramDef.max) {
        errors.push(
          `${matchedName} > ${paramKey}: ${value} est supérieur à la limite max (${paramDef.max})`
        );
      }
      
      // 4. Vérifier les valeurs énumérées
      if (paramDef.values && !paramDef.values.map(v => v.toLowerCase()).includes(param.value.toLowerCase())) {
        errors.push(
          `${matchedName} > ${paramKey}: "${param.value}" n'est pas une valeur valide. Valeurs acceptées: ${paramDef.values.join(', ')}`
        );
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  validateBatch(tutorials: TutorialStep[]): {
    valid: boolean;
    results: Array<{ tutorial: TutorialStep, validation: ValidationResult }>;
  } {
    const results = tutorials.map(tutorial => ({
      tutorial,
      validation: this.validate(tutorial)
    }));
    
    const allValid = results.every(r => r.validation.valid);
    
    return { valid: allValid, results };
  }
  
  // Suggérer des corrections automatiques
  autoCorrect(tutorial: TutorialStep): TutorialStep {
    const corrected = { ...tutorial };
    let effectsDB: Record<string, EffectDefinition>;
    
    if (tutorial.software === 'premiere') effectsDB = PREMIERE_EFFECTS;
    else if (tutorial.software === 'after-effects') effectsDB = AFTER_EFFECTS_EFFECTS;
    else if (tutorial.software === 'photoshop') effectsDB = PHOTOSHOP_EFFECTS;
    else if (tutorial.software === 'illustrator') effectsDB = ILLUSTRATOR_EFFECTS;
    else if (tutorial.software === 'blender') effectsDB = BLENDER_EFFECTS;
    else return corrected;
    
    // Resolve Effect Name
    let effectDef = effectsDB[tutorial.effect];
    let matchedName = tutorial.effect;

    if (!effectDef) {
        const foundKey = Object.keys(effectsDB).find(k => k.toLowerCase() === tutorial.effect.toLowerCase());
        if (foundKey) {
            effectDef = effectsDB[foundKey];
            matchedName = foundKey;
            corrected.effect = foundKey; // Auto-correct name casing
        } else if (tutorial.software === 'after-effects' && tutorial.effect.toLowerCase() === 'fast blur') {
            effectDef = effectsDB['Fast Box Blur'];
            corrected.effect = 'Fast Box Blur';
        } else {
            return corrected; // Cannot correct unknown effect
        }
    }
    
    corrected.parameters = tutorial.parameters.map(param => {
      const paramKey = Object.keys(effectDef.parameters).find(k => k.toLowerCase() === param.name.toLowerCase());
      if (!paramKey) return param;
      
      const paramDef = effectDef.parameters[paramKey];
      const valueStr = param.value.replace('%', '').replace('px', '').replace('°', '').replace('pt', '').replace('m', '').replace('W', '').trim();
      let value = parseFloat(valueStr);
      
      if (isNaN(value)) return param;

      // Clamper les valeurs dans les limites
      if (paramDef.min !== undefined && value < paramDef.min) {
        value = paramDef.min;
      }
      if (paramDef.max !== undefined && value > paramDef.max) {
        value = paramDef.max;
      }
      
      // Re-add unit if present in original or definition
      let suffix = '';
      if (param.value.includes('%') || paramDef.unit === '%') suffix = '%';
      else if (param.value.includes('px') || paramDef.unit === 'px' || paramDef.unit === 'pixels') suffix = 'px';
      else if (param.value.includes('°') || paramDef.unit === '°' || paramDef.unit === 'degrees') suffix = '°';
      else if (param.value.includes('pt') || paramDef.unit === 'pt') suffix = 'pt';
      else if (param.value.includes('m') || paramDef.unit === 'm') suffix = 'm';
      else if (param.value.includes('W') || paramDef.unit === 'W') suffix = 'W';

      return {
        ...param,
        name: paramKey, // Correct casing
        value: `${value}${suffix}`,
        unit: paramDef.unit || param.unit
      };
    });
    
    return corrected;
  }
}

export const tutorialValidator = new TutorialValidator();

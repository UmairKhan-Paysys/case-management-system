import { AlertType } from '@prisma/client';

export interface Prediction {
  priorityScore: number; // A score between 0 and 1 indicating the priority level
  alertType: AlertType; // The type of alert predicted
  confidence_per: number; // Confidence percentage of the prediction
  isTruePositive: boolean; // Indicates if the prediction is a true positive
}

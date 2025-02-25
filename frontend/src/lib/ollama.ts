/**
 * Utility functions for interacting with the Ollama API via backend
 */

import { TranslateToSQL } from "../../wailsjs/go/main/App";
import { TableInfo } from "@/types/table-info";

/**
 * Traduit un texte en langage naturel en requête SQL en utilisant le backend Go
 * qui communique avec le modèle llama3
 * 
 * @param text Le texte en langage naturel à traduire
 * @param tableInfo Informations sur les tables disponibles (optionnel)
 * @returns Une promesse qui résout vers la requête SQL générée
 */
export async function translateToSql(text: string, tableInfo?: TableInfo[]): Promise<string> {
  try {
    // Convertir les informations de tables en JSON pour les passer au backend
    const tableInfoJSON = tableInfo ? JSON.stringify(tableInfo) : "";
    
    // Appeler la fonction backend
    const sqlQuery = await TranslateToSQL(text, tableInfoJSON);
    
    return sqlQuery;
  } catch (error) {
    console.error('Erreur lors de la traduction en SQL:', error);
    throw error;
  }
} 
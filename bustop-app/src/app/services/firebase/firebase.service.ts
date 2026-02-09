import { Injectable } from '@angular/core';
import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore"; // Importe isso

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private readonly _FIREBASE_CONFIG = {
    apiKey: "AIzaSyCk8dNdYhiw8tQ7Ae9JE4G97bql4e0TP8s",
    authDomain: "bustop-app-2e78f.firebaseapp.com",
    projectId: "bustop-app-2e78f",
    storageBucket: "bustop-app-2e78f.firebasestorage.app",
    messagingSenderId: "911142071788",
    appId: "1:911142071788:web:2533f1787d3eb736fea4c9",
    measurementId: "G-3BQH3CLWR5"
  };

  private readonly _APP = initializeApp(this._FIREBASE_CONFIG);
  private readonly _DB = getFirestore(this._APP); // Inicializa o Banco de Dados

  constructor() { }

  getFirestore(): Firestore {
    return this._DB;
  }
}
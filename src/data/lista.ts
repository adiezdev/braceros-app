/**
 * Lista de partida, transcrita de las tres hojas manuscritas.
 *
 * Formato de cada línea:
 *   puesto ; nombre ; bloque ; teléfono ; Exaltación ; San Martín
 *
 * Marcas: V asistió · F falta · FJ falta justificada · vacío no se sabe
 *
 * El puesto de la izquierda es solo referencia: el número real lo da el
 * orden de las líneas, así que para mover a alguien basta mover su línea.
 */
export const LISTA = `
1;Agapito López Pacheco;HONORARIOS;;V;
2;José Luis de las Cuevas Pérez;HONORARIOS;;F;
3;Fernando Núñez Chaves;HONORARIOS;;F;
4;José Alfonso Álvarez Rodríguez;HONORARIOS;;F;
5;José Joaquín Díaz Rodríguez;HONORARIOS;;F;
6;Javier Mendaña Rodríguez;HONORARIOS;;F;
7;Agustín Rajoy Feijóo;HONORARIOS;;F;
8;Vicente Hernández Rubio;HONORARIOS;;F;
9;Martín Méndez Prieto;HONORARIOS;;F;
10;Juan José Álvarez González;HONORARIOS;;F;
11;Benito Méndez Rodríguez;HONORARIOS;;F;
12;Vidal Urdiales Gutiérrez;HONORARIOS;;F;
13;Justo Fernández González;HONORARIOS;;F;
14;Jorge Pérez Ayala;HONORARIOS;;F;
15;Gabriel Adeva Martínez;TITULARES;;V;V
16;Miguel Ángel Carrasco Fernández;TITULARES;;V;V
17;Manuel Díez López;TITULARES;;V;V
18;Alejandro Díez López;TITULARES;;V;V
19;José María Fernández Gallot;TITULARES;;V;V
20;José Joaquín Fuello Velda;TITULARES;;FJ;F
21;Gonzalo González García;TITULARES;;V;V
22;Ángel José Muñiz Cadenas;TITULARES;;V;V
23;Miguel Ángel Marcos Arias;TITULARES;;V;V
24;Juan José Pérez Alonso;TITULARES;;V;V
25;Ángel Robles Rodríguez;TITULARES;;V;F
26;Luis Rubén Rodríguez García;TITULARES;;V;V
27;Miguel Romano Aparicio;TITULARES;;V;V
28;Emilio Fernández García;TITULARES;;V;V
29;José Colores Valle Fernández;TITULARES;;V;V
30;Javier García Prieto;TITULARES;;V;V
31;Iván Lera Gutiérrez;TITULARES;;V;V
32;Vicente Aller Martínez;TITULARES;;V;V
33;Luis Nogal Villanueva;TITULARES;;V;
34;Balduino Jesús Mamés Andrés;TITULARES;;F;F
35;Manuel Redondo Prieto;TITULARES;;V;F
36;Antonio Fernández Fernández;TITULARES;;V;FJ
37;Roberto Canuria Salazar;TITULARES;;V;FJ
38;Rafael Menéndez Pérez;TITULARES;;F;
39;Jorge Fernández Fernández;TITULARES;;V;V
40;Javier Nicolás Ibáñez;TITULARES;;V;V
41;Luis Carlos Moreno;TITULARES;;F;V
42;Erundino Redondo Llamazares;TITULARES;;F;
43;José María Vidal Gutiérrez;TITULARES;;F;
44;Manuel Romero Gutiérrez;TITULARES;;F;F
45;Jorge Pérez García;TITULARES;;F;
46;Antonio Salvador Fernández;TITULARES;;V;
47;Juan Antonio Salvador Nogal;TITULARES;;V;
48;Álvaro Labanda Canal;TITULARES;;V;F
49;José María Blanco Campillo;TITULARES;;F;
50;Javier de las Cuevas Suárez;TITULARES;;F;V
51;Javier Fernández Romano;TITULARES;;FJ;F
52;Álvaro González Hernández;TITULARES;;V;F
53;Óscar Ordás Díez;TITULARES;;V;F
54;Antonio Nido Argüello;TITULARES;;F;F
55;Sergio Redondo García;TITULARES;;V;V
56;Óscar Alegre González;TITULARES;;V;V
57;Israel Adeva García;TITULARES;;V;V
58;Javier Alonso Fernández;TITULARES;;V;V
59;Ignacio Llamazares Blanco;TITULARES;;V;
60;Germán Díez Soto;TITULARES;;V;
61;Francisco Javier Fernández Pejenaoute;TITULARES;;V;F
62;Orlando García Fraile;TITULARES;;V;F
63;Jorge de la Torre Fernández;TITULARES;;F;F
64;Marcos Díez Martínez;TITULARES;;V;F
65;David García Hompanera;TITULARES;;V;V
66;Iván Ordás Huerga;TITULARES;;V;F
67;Emilio Villena Escudero;TITULARES;;V;F
68;Eduardo Cimas Morán;TITULARES;;F;V
69;Juan Cristóbal Rodríguez;TITULARES;;V;V
70;Emiliano Castro Villanueva;TITULARES;;V;V
71;Álvaro González Hernández;TITULARES;;V;F
72;Álvaro Pérez Díez;TITULARES;;F;V
73;Mario Fernández Álvarez;TITULARES;;V;F
74;Ángel Martínez Torre;SUPLENTES;;F;
75;Rodrigo Ordás García;SUPLENTES;;V;V
76;Tomás Moreno Álvarez;SUPLENTES;;V;F
77;Héctor San Martín De la Granja;SUPLENTES;;V;
78;Jorge Manrique Gago Marcos;SUPLENTES;;;
79;Antonio Fuertes Falagán;SUPLENTES;;V;F
80;Javier Casal Rodríguez;SUPLENTES;;V;V
81;José Mariano de Priego Fernández;SUPLENTES;;V;F
82;Javier Casal Suárez;SUPLENTES;;V;V
83;Marcos Andrés Robles;SUPLENTES;;V;V
84;Juan Valle Cobos;SUPLENTES;;V;V
85;Óscar García Fernández;SUPLENTES;;V;
86;Juan Delgado Suárez;SUPLENTES;;V;F
87;Alfonso Belinchón García;SUPLENTES;;F;F
88;Luis Manuel Pérez López;SUPLENTES;;F;F
89;Alejandro Villar Martínez;SUPLENTES;;V;F
90;Polo Jiménez Bravo;SUPLENTES;;V;V
91;Juan Pérez Jañez;SUPLENTES;;F;F
92;David del Olmo Benavides;SUPLENTES;;F;F
93;Jorge Rodríguez Valcárcel;SUPLENTES;;F;FJ
94;Javier Díez Rodríguez;SUPLENTES;;V;F
95;Francisco Nicolás Sánchez Noya;SUPLENTES;;F;F
96;Gabriel Adeva Alonso;SUPLENTES;;V;V
97;Joaquín Vives Gancedo;SUPLENTES;;F;F
98;Guillermo Álvarez Fernández;SUPLENTES;;V;V
99;Pablo Gallizo Carro;SUPLENTES;;V;F
100;Fidel Redondo Robles;SUPLENTES;;FJ;V
101;Héctor Casado Blázquez;SUPLENTES;;V;V
102;Juan Gómez Rodríguez;SUPLENTES;;V;F
103;David Chimeno Álvarez;SUPLENTES;;V;V
104;Javier González Rendueles;SUPLENTES;;V;V
105;Jorge Atienza Velenda;SUPLENTES;;V;F
106;Rodrigo Gago García;SUPLENTES;;F;V
107;Sergio San Martín Olmo;SUPLENTES;;V;F
108;Ángel Prieto San Francisco;SUPLENTES;;F;F
109;Gabriel Adeva García;SUPLENTES;;V;V
110;Diego Rafael Olguín;SUPLENTES;;V;F
111;Marcos Vega Llanes;SUPLENTES;;V;F
112;Mario García del Pozo;SUPLENTES;;V;
113;Iván Alonso Félix;SUPLENTES;;V;
114;Daniel Alonso Higelmo;SUPLENTES;;FJ;
115;Daniel Piñán Puente;SUPLENTES;;V;
116;Álvaro Robles Santín;SUPLENTES;;V;
117;Pablo Rodríguez del Busto;SUPLENTES;;V;
118;Nicolás Díez Álvarez;SUPLENTES;;;
119;Iker Domínguez Fdez.;SUPLENTES;633323360;;
120;Daniel Fontano Méndez;SUPLENTES;;F;
121;Olmo Siero Gutiérrez;SUPLENTES;;F;F
122;Héctor Caballero Fernández;SUPLENTES;;F;
123;Rafael de Abajo Fernández;SUPLENTES;;F;
124;Rodrigo Castañón Díez;SUPLENTES;;F;
125;Ismael Fernández Olmo;SUPLENTES;;F;
126;Daniel Bao Casais;SUPLENTES;;F;F
127;José Antonio Fariñas;SUPLENTES;;F;F
128;Luis Merino Álvarez;SUPLENTES;;F;F
129;Marcos Díez;SUPLENTES;;F;F
130;Iván Rabanal Fernández;SUPLENTES;;F;F
`.trim();

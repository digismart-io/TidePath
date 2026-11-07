// Authored fictional household profiles, not a surname-to-language classifier.
// Real registration always stores the family's stated contact preference.
export const familyProfiles = [
  ['Rosa','Rivera','Spanish'],['Mei','Chen','English'],['Lucia','Ortega','Spanish'],['Dana','Johnson','English'],
  ['Anita','Patel','English'],['Simone','Williams','English'],['Paula','Santos','Spanish'],['Linh','Nguyen','English'],
  ['Morgan','Thompson','English'],['Isabel','Martinez','Spanish'],['Jordan','Reed','English'],['Amira','Hassan','English'],
  ['Elena','Garcia','Spanish'],['Taylor','Brown','English'],['Avery','Lewis','English'],['Jisoo','Kim','English'],
  ['Cameron','Robinson','English'],['Valeria','Lopez','Spanish'],['Casey','Walker','English'],['Robin','Allen','English'],
  ['Drew','Young','English'],['Alex','King','English'],['Riley','Wright','English'],['Jamie','Scott','English'],
  ['Sage','Green','English'],['Leslie','Baker','English'],['Quinn','Adams','English'],['Parker','Nelson','English'],
  ['Reese','Hill','English'],['Sam','Campbell','English'],['Blair','Mitchell','English'],['Skyler','Carter','English'],
  ['Mireille','Pierre','Haitian Creole',['Adrien','Solange']],
  ['Jean-Luc','Jean','Haitian Creole',['Nadine','Samuel']],
  ['Sabine','Desrosiers','Haitian Creole',['Beatrice','David']],
  ['Marie-Claire','Joseph','Haitian Creole',['Andre','Estelle']],
  ['Nathalie','Baptiste','Haitian Creole',['Celine','Daniel']],
  ['Emmanuel','Louis','Haitian Creole',['Lucien','Carine']],
  ['Roseline','Charles','Haitian Creole',['Gabrielle','Joel']],
  ['Frantz','Etienne','Haitian Creole',['Thierry','Michaelle']],
  ['Claudine','Francois','Haitian Creole',['Elise','Patrick']],
  ['Wilner','Dorsainvil','Haitian Creole',['Raphael','Naomie']],
  ['Marisol','Alvarez','Spanish',['Adriana','Carlos']],
  ['Beatriz','Hernandez','Spanish',['Javier','Luciana']],
  ['Daniela','Rodriguez','English',['Gabriela','Nicolas']],
  ['Carmen','Gonzalez','Spanish',['Mariana','Emilio']],
  ['Raul','Diaz','Spanish',['Hector','Clara']],
  ['Sofia','Perez','English',['Isabel','Victor']],
  ['Patricia','Castillo','Spanish',['Pablo','Camila']],
  ['Alejandro','Vazquez','Spanish',['Ximena','Diego']],
  ['Ana','Torres','English',['Lena','Oscar']],
  ['Rafael','Cruz','Spanish',['Paloma','Thiago']],
  ['Guerline','Moreau','Haitian Creole',['Odette','Marc']],
  ['Josue','Laurent','Haitian Creole',['Yves','Flore']],
  ['Manise','Paul','Haitian Creole',['Fabiola','Serge']],
  ['Renald','Michel','Haitian Creole',['Bastien','Judith']],
  ['Edeline','Augustin','Haitian Creole',['Daphnee','Junior']],
  ['Ernst','Celestin','Haitian Creole',['Gaelle','Stevens']],
  ['Solange','Noel','Haitian Creole',['Bertrand','Nerlande']],
  ['Michaelle','Toussaint','Haitian Creole',['Fritz','Lovely']],
  ['Patrick','Fleurant','Haitian Creole',['Rachelle','Wesner']],
  ['Carine','Saintil','Haitian Creole',['Jean-Marc','Esther']],
  ['Teresa','Ruiz','Spanish',['Dalia','Cesar']],
  ['Gabriel','Mendez','English',['Bianca','Adrian']],
  ['Marta','Delgado','Spanish',['Ines','Mateo']],
  ['Luis','Romero','Spanish',['Enzo','Valentina']],
  ['Adriana','Suarez','Spanish',['Helena','Bruno']],
  ['Roberto','Medina','Spanish',['Gael','Alina']],
  ['Luciana','Pena','Spanish',['Reina','Santiago']],
  ['Isabel','Valdes','Spanish',['Yara','Sebastian']]
].map(([guardianFirst,lastName,language,childNames=[]])=>({guardianFirst,lastName,language,childNames}));

export const studentFamilyIndex = i => i<8?i:i<40?i-8:32+Math.floor((i-40)*38/60);
export function authoredChildName(index) {
  const familyIndex=studentFamilyIndex(index);
  if(index<40)return null; // Keep the original demonstration characters.
  let siblingIndex=0;
  for(let i=40;i<index;i++)if(studentFamilyIndex(i)===familyIndex)siblingIndex++;
  return familyProfiles[familyIndex].childNames[siblingIndex];
}

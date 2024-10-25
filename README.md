# Potential-Fields-Robot-Simulator

![image](https://github.com/user-attachments/assets/3f0a787c-24f9-41ed-b955-d167fc9d253a)

This is a simple javascript robot simulator based on potential fields, with a user-friendly interface.<br>
It's very easy to use, it provides a straight view on what the potential fields are and how they revolutioned robotics.<br>
When you open the simulator you will see an empty world with a grid.<br>

## Editing Tools

![image](https://github.com/user-attachments/assets/4bad4622-ccd0-482e-94b5-b916b6e21b3a)

In the right panel you can see a section dedicated to the editing tools, to use them you have to be in *reset* state, so if you are not, click the **reset** button on the top. Let's talk briefly of them:
<br>
<br>
<br>

- ### Select

	‎‎You can use the select button tool to move, by dragging and dropping, all the objects that you placed.<br>

- ### Walls
  
	![image](https://github.com/user-attachments/assets/6bd74cd3-5593-4bff-bf93-ac6df4f47dfa)

	The walls are line shaped objects that repel the robot by generating a repulsive vector that is directly proportional to the distance from the robot.<br>
	You can edit the weight (strength) of the repulsive vector with the **Repulsive Force** parameter under the Robot Parameters section.<br>
  **Be careful to adjust the **sensor range** parameter located under the Robot Parameters section accordingly to the available space the robot has to pass.**<br>

- ### Homebase
  
	![image](https://github.com/user-attachments/assets/d1144b86-a77c-4060-b46f-e73423904da0)

	The homebases are points that attract the robot by generating an attractive vector, like the light bulb for the W. Grey Walter.'s [Machine Speculatrix](https://home.csulb.edu/~wmartinz/content/w-grey-walter-and-his-turtle-robots.html), a rudimental turtle robot built in 1948.<br>
	They are automatically numerated, and the robot is attracted only from 1 at time.<br>
	You can edit the weight (strength) of the attractive vector with the **Attractive Force** parameter under the Robot Parameters section.<br>

- ### Obstacles
  
	‎‎![image](https://github.com/user-attachments/assets/fcaf2fdc-27b7-4e62-8e60-989d2c95472a)

	‎‎The obstacles are round shaped objects that repel the robot by generating a repulsive vector that is directly proportional to the distance from the robot.<br>
	You can edit the weight (strength) of the repulsive vector with the **Repulsive Force** parameter under the Robot Parameters section.<br>
  **Be careful to adjust the **sensor range** parameter located under the Robot Parameters section accordingly to the available space the robot has to pass.**<br>
  
- ### Start Point
  
	‎‎![image](https://github.com/user-attachments/assets/fbf0c00d-e6f5-41a5-9ee0-46bf6a949bd1)

	‎‎The start point it's the spawn point of the robot.<br>
	‎‎You can add only 1 and you can teleport back the robot on this position by clicking on the **reset** button on the top. <br>

- ### Delete

	‎‎You can use the delete button tool to delete objects in the world just by clicking on them.<br>

## Extras

- ### Boundary Repulsion
	The boundary repulsion is a repulsion generated by the borders of the map.<br>
 	You can toggle this option by checking the **Enable Boundary Repulsion** on the top, and you can edit the weight (strength) of the boundary repulsive vector with the **Boundary Force** parameter under the Robot Parameters section.

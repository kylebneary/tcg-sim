# tcg-sim
This is my new coding project

## Project Brainstorm
- GUI Web app (framework TBD)
    - Main video input cell, similar to a Youtube video, capable of capturing a live video feed, or enabling a user to upload a video file
    - Drop-down to select set of pack being opened
    - Simple user input (space bar) to request model to identify card in frame
    - Ten cells under the video capture cell that will show each card as it is identified
    - **Later**: Submit button to add cards to your collection
- Back end (Python, Flask)
    - Identify what card is in frame when input is given
    - GenAI to identify card without additional information (other that card set)
    - Relevant data about card once identified
        - Code to scrape data from some online source (TBD)
        - Maybe look for a place where someone else has already compiled these data

### Tasks
1. Ask ChatGPT for recommendations on Front-end framework
2. Build single-page GUI front-end
3. Find and scrape data on Pokemon TCG cards
4. Build simple database to house data
5. AI engine to identify cards
6. Integrate
7. Launch (host on public cloud: probably GCP)

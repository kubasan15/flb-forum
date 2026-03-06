# FLB Forum Home Cards

Discourse theme component that adds homepage cards linking to game categories.

## Install

1. In Discourse Admin -> Customize -> Themes, click **Install**.
2. Choose **From a Git repository** and paste this repo URL.
3. Enable the component for your Dracula theme.

## Edit cards

Update the HTML in common/after_header.html:
- Replace category links with your category URLs, e.g. /c/world-of-airports/12
- Replace image URLs
- Update names and descriptions

Styles are in common/common.scss.
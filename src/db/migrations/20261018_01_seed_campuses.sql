-- Seed the schools shown in the /students selector.
--
-- Migration 20261016_01 created the campuses table with one school
-- (the first). This adds the other 99, so a student at any of them can
-- pick their school and, once they confirm a .edu address on its domain, have it
-- recorded on their account. The selector sorts the list alphabetically in the
-- application; sort_order now only breaks a tie when matching an email domain.
--
-- The list and the domains are src/lib/campus-directory.ts, and a test keeps this
-- file identical to it. The domains are the ones students use for their school
-- address; a subdomain of a listed domain matches too (students.example.edu
-- matches example.edu). A wrong or missing domain is corrected with an update to
-- campuses.email_domains, no deploy needed.
--
-- Additive and idempotent: it inserts rows and skips any slug that already exists.
--
-- Rollback (profiles.campus_id is set to null for anyone recorded at these schools):
--   delete from public.campuses where slug <> '<the first school's slug>';

begin;

insert into public.campuses (slug, name, short_name, email_domains)
values
  ('american-university', 'American University', 'American', array['american.edu']),
  ('arizona-state-university', 'Arizona State University', 'Arizona State', array['asu.edu']),
  ('auburn-university', 'Auburn University', 'Auburn', array['auburn.edu']),
  ('baylor-university', 'Baylor University', 'Baylor', array['baylor.edu']),
  ('boston-college', 'Boston College', 'Boston College', array['bc.edu']),
  ('boston-university', 'Boston University', 'Boston University', array['bu.edu']),
  ('brown-university', 'Brown University', 'Brown', array['brown.edu']),
  ('carnegie-mellon-university', 'Carnegie Mellon University', 'Carnegie Mellon', array['cmu.edu']),
  ('catholic-university-of-america', 'Catholic University of America', 'Catholic University', array['cua.edu']),
  ('clemson-university', 'Clemson University', 'Clemson', array['clemson.edu']),
  ('college-of-the-holy-cross', 'College of the Holy Cross', 'Holy Cross', array['holycross.edu']),
  ('college-of-william-and-mary', 'College of William & Mary', 'William & Mary', array['wm.edu']),
  ('columbia-university', 'Columbia University', 'Columbia', array['columbia.edu']),
  ('cornell-university', 'Cornell University', 'Cornell', array['cornell.edu']),
  ('dartmouth-college', 'Dartmouth College', 'Dartmouth', array['dartmouth.edu']),
  ('drexel-university', 'Drexel University', 'Drexel', array['drexel.edu']),
  ('duke-university', 'Duke University', 'Duke', array['duke.edu']),
  ('emory-university', 'Emory University', 'Emory', array['emory.edu']),
  ('fairfield-university', 'Fairfield University', 'Fairfield', array['fairfield.edu']),
  ('florida-state-university', 'Florida State University', 'Florida State', array['fsu.edu']),
  ('fordham-university', 'Fordham University', 'Fordham', array['fordham.edu']),
  ('george-washington-university', 'George Washington University', 'George Washington', array['gwu.edu']),
  ('georgetown-university', 'Georgetown University', 'Georgetown', array['georgetown.edu']),
  ('georgia-tech', 'Georgia Tech', 'Georgia Tech', array['gatech.edu']),
  ('gonzaga-university', 'Gonzaga University', 'Gonzaga', array['gonzaga.edu']),
  ('harvard-university', 'Harvard University', 'Harvard', array['harvard.edu']),
  ('howard-university', 'Howard University', 'Howard', array['howard.edu']),
  ('indiana-university-bloomington', 'Indiana University Bloomington', 'Indiana', array['iu.edu']),
  ('james-madison-university', 'James Madison University', 'James Madison', array['jmu.edu']),
  ('johns-hopkins-university', 'Johns Hopkins University', 'Johns Hopkins', array['jhu.edu', 'jh.edu']),
  ('louisiana-state-university', 'Louisiana State University', 'LSU', array['lsu.edu']),
  ('marquette-university', 'Marquette University', 'Marquette', array['marquette.edu']),
  ('massachusetts-institute-of-technology', 'Massachusetts Institute of Technology', 'MIT', array['mit.edu']),
  ('michigan-state-university', 'Michigan State University', 'Michigan State', array['msu.edu']),
  ('morgan-state-university', 'Morgan State University', 'Morgan State', array['morgan.edu']),
  ('nc-state-university', 'NC State University', 'NC State', array['ncsu.edu']),
  ('new-york-university', 'New York University', 'NYU', array['nyu.edu']),
  ('northeastern-university', 'Northeastern University', 'Northeastern', array['northeastern.edu']),
  ('northwestern-university', 'Northwestern University', 'Northwestern', array['northwestern.edu']),
  ('ohio-state-university', 'Ohio State University', 'Ohio State', array['osu.edu']),
  ('penn-state-university', 'Penn State University', 'Penn State', array['psu.edu']),
  ('princeton-university', 'Princeton University', 'Princeton', array['princeton.edu']),
  ('purdue-university', 'Purdue University', 'Purdue', array['purdue.edu']),
  ('rice-university', 'Rice University', 'Rice', array['rice.edu']),
  ('rutgers-university', 'Rutgers University', 'Rutgers', array['rutgers.edu']),
  ('saint-josephs-university', 'Saint Joseph’s University', 'Saint Joseph’s', array['sju.edu']),
  ('saint-louis-university', 'Saint Louis University', 'Saint Louis', array['slu.edu']),
  ('santa-clara-university', 'Santa Clara University', 'Santa Clara', array['scu.edu']),
  ('southern-methodist-university', 'Southern Methodist University', 'SMU', array['smu.edu']),
  ('stanford-university', 'Stanford University', 'Stanford', array['stanford.edu']),
  ('syracuse-university', 'Syracuse University', 'Syracuse', array['syr.edu']),
  ('temple-university', 'Temple University', 'Temple', array['temple.edu']),
  ('texas-am-university', 'Texas A&M University', 'Texas A&M', array['tamu.edu']),
  ('texas-christian-university', 'Texas Christian University', 'TCU', array['tcu.edu']),
  ('texas-tech-university', 'Texas Tech University', 'Texas Tech', array['ttu.edu']),
  ('towson-university', 'Towson University', 'Towson', array['towson.edu']),
  ('tufts-university', 'Tufts University', 'Tufts', array['tufts.edu']),
  ('tulane-university', 'Tulane University', 'Tulane', array['tulane.edu']),
  ('uc-berkeley', 'UC Berkeley', 'Berkeley', array['berkeley.edu']),
  ('uc-davis', 'UC Davis', 'UC Davis', array['ucdavis.edu']),
  ('uc-san-diego', 'UC San Diego', 'UC San Diego', array['ucsd.edu']),
  ('uc-santa-barbara', 'UC Santa Barbara', 'UC Santa Barbara', array['ucsb.edu']),
  ('ucla', 'UCLA', 'UCLA', array['ucla.edu']),
  ('unc-chapel-hill', 'UNC Chapel Hill', 'UNC', array['unc.edu']),
  ('university-of-alabama', 'University of Alabama', 'Alabama', array['ua.edu']),
  ('university-of-arizona', 'University of Arizona', 'Arizona', array['arizona.edu']),
  ('university-of-central-florida', 'University of Central Florida', 'UCF', array['ucf.edu']),
  ('university-of-chicago', 'University of Chicago', 'UChicago', array['uchicago.edu']),
  ('university-of-colorado-boulder', 'University of Colorado Boulder', 'CU Boulder', array['colorado.edu']),
  ('university-of-connecticut', 'University of Connecticut', 'UConn', array['uconn.edu']),
  ('university-of-delaware', 'University of Delaware', 'Delaware', array['udel.edu']),
  ('university-of-florida', 'University of Florida', 'Florida', array['ufl.edu']),
  ('university-of-georgia', 'University of Georgia', 'Georgia', array['uga.edu']),
  ('university-of-illinois-urbana-champaign', 'University of Illinois Urbana-Champaign', 'Illinois', array['illinois.edu']),
  ('university-of-iowa', 'University of Iowa', 'Iowa', array['uiowa.edu']),
  ('university-of-kentucky', 'University of Kentucky', 'Kentucky', array['uky.edu']),
  ('university-of-maryland-baltimore-county', 'University of Maryland, Baltimore County', 'UMBC', array['umbc.edu']),
  ('university-of-maryland-college-park', 'University of Maryland, College Park', 'Maryland', array['umd.edu']),
  ('university-of-miami', 'University of Miami', 'Miami', array['miami.edu']),
  ('university-of-michigan', 'University of Michigan', 'Michigan', array['umich.edu']),
  ('university-of-minnesota', 'University of Minnesota', 'Minnesota', array['umn.edu']),
  ('university-of-notre-dame', 'University of Notre Dame', 'Notre Dame', array['nd.edu']),
  ('university-of-oregon', 'University of Oregon', 'Oregon', array['uoregon.edu']),
  ('university-of-pennsylvania', 'University of Pennsylvania', 'Penn', array['upenn.edu']),
  ('university-of-pittsburgh', 'University of Pittsburgh', 'Pitt', array['pitt.edu']),
  ('university-of-richmond', 'University of Richmond', 'Richmond', array['richmond.edu']),
  ('university-of-south-carolina', 'University of South Carolina', 'South Carolina', array['sc.edu']),
  ('university-of-southern-california', 'University of Southern California', 'USC', array['usc.edu']),
  ('university-of-tennessee', 'University of Tennessee', 'Tennessee', array['utk.edu']),
  ('university-of-texas-at-austin', 'University of Texas at Austin', 'UT Austin', array['utexas.edu']),
  ('university-of-virginia', 'University of Virginia', 'UVA', array['virginia.edu']),
  ('university-of-washington', 'University of Washington', 'UW', array['uw.edu', 'washington.edu']),
  ('university-of-wisconsin-madison', 'University of Wisconsin–Madison', 'Wisconsin', array['wisc.edu']),
  ('vanderbilt-university', 'Vanderbilt University', 'Vanderbilt', array['vanderbilt.edu']),
  ('villanova-university', 'Villanova University', 'Villanova', array['villanova.edu']),
  ('virginia-tech', 'Virginia Tech', 'Virginia Tech', array['vt.edu']),
  ('wake-forest-university', 'Wake Forest University', 'Wake Forest', array['wfu.edu']),
  ('washington-university-in-st-louis', 'Washington University in St. Louis', 'WashU', array['wustl.edu']),
  ('yale-university', 'Yale University', 'Yale', array['yale.edu'])
on conflict (slug) do nothing;

commit;
